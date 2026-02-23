const { config } = require("../config/env");
const { HttpError } = require("../utils/httpError");
const { toPlanningCenterTimestamp } = require("../utils/time");

const {
  planningCenter: { appId, secret, eventsPerPage: defaultEventsPerPage },
} = config;

const STARTS_AT_QUERY_KEY = "where[starts_at][gte]";

async function fetchUpcomingEvents({
  page,
  groupTypeId,
  upcoming = false,
  passthroughParams = [],
}) {
  const url = new URL(
    `https://api.planningcenteronline.com/groups/v2/group_types/${groupTypeId}/events`
  );

  applyPassthroughParams(url, passthroughParams);

  const params = normalizeParams({
    perPageRaw: url.searchParams.get("per_page"),
    offsetRaw: url.searchParams.get("offset"),
    startsAtRaw: url.searchParams.get(STARTS_AT_QUERY_KEY),
    page,
  });

  if (params.perPage !== undefined) {
    ensureSearchParam(url, "per_page", String(params.perPage));
  }

  if (params.offset !== undefined) {
    ensureSearchParam(url, "offset", String(params.offset));
  }

  const shouldApplyUpcoming = upcoming === true;

  if (shouldApplyUpcoming) {
    url.searchParams.set(
      STARTS_AT_QUERY_KEY,
      toPlanningCenterTimestamp()
    );
    url.searchParams.set("order", "starts_at");
  } else if (params.startsAt) {
    url.searchParams.set(STARTS_AT_QUERY_KEY, params.startsAt);
  }

  logRequest({
    groupTypeId,
    page: params.page,
    perPage: params.perPage,
    offset: params.offset,
    startsAt: url.searchParams.get(STARTS_AT_QUERY_KEY),
    upcoming: shouldApplyUpcoming,
    url,
  });

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Basic ${toBasicAuthToken(appId, secret)}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    console.error(
      `Planning Center request failed (${response.status}): ${errorText}`
    );
    throw new HttpError(
      `Planning Center request failed with status ${response.status}`,
      502
    );
  }

  const payload = await response.json();
  const enrichedEvents = await enrichEventsWithGroupDetails(payload?.data ?? []);

  const finalStartsAt = url.searchParams.get(STARTS_AT_QUERY_KEY);

  return {
    startsAt: finalStartsAt,
    page: params.page,
    offset: params.offset,
    pageSize: params.perPage,
    events: enrichedEvents,
    links: payload?.links ?? {},
    nextExist: Boolean(payload?.links?.next),
    upcoming: shouldApplyUpcoming,
  };
}

async function fetchGroupsByGroupType({
  groupTypeId,
  page,
  passthroughParams = [],
}) {
  const url = new URL(
    `https://api.planningcenteronline.com/groups/v2/group_types/${groupTypeId}/groups`
  );

  applyPassthroughParams(url, passthroughParams);

const params = normalizePagination({
  perPageRaw: url.searchParams.get('per_page'),
  offsetRaw: url.searchParams.get('offset'),
  page,
});

  if (params.perPage !== undefined) {
    ensureSearchParam(url, "per_page", String(params.perPage));
  }

  if (params.offset !== undefined) {
    ensureSearchParam(url, "offset", String(params.offset));
  }

  logRequest({
    groupTypeId,
    endpoint: "groups",
    page: params.page,
    perPage: params.perPage,
    offset: params.offset,
    url,
  });

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Basic ${toBasicAuthToken(appId, secret)}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    console.error(
      `Planning Center groups request failed (${response.status}): ${errorText}`
    );
    throw new HttpError(
      `Planning Center request failed with status ${response.status}`,
      502
    );
  }

  const payload = await response.json();
  const groups = mergeIncludedResources(
    payload?.data ?? [],
    payload?.included ?? []
  );

  return {
    page: params.page,
    offset: params.offset,
    pageSize: params.perPage,
    groups,
    links: payload?.links ?? {},
    nextExist: Boolean(payload?.links?.next),
    includes: payload?.included ?? [],
  };
}

// Line 163 ke baad add karo (fetchGroupsByGroupType ke baad)

async function fetchAllGroups({ page, passthroughParams = [] }) {
  const url = new URL(
    'https://api.planningcenteronline.com/groups/v2/groups'
  );

  // archived_at=null by default
  url.searchParams.set('archived_at', 'null');

  url.searchParams.set('include', 'enrollment');


  applyPassthroughParams(url, passthroughParams);

  const params = normalizePagination({
    perPageRaw: url.searchParams.get('per_page'),
    offsetRaw: url.searchParams.get('offset'),
    page,
  });

  const requestedPerPage = params.perPage || 6;


const finalPerPage = requestedPerPage * 2;
const finalOffset = params.offset || 0;

    ensureSearchParam(url, 'per_page', String(finalPerPage));
  ensureSearchParam(url, 'offset', String(finalOffset));

  logRequest({
    groupTypeId: 'all',
    endpoint: 'all-groups',
    page: params.page,
    perPage: finalPerPage,  // ✅ Use finalPerPage
    offset: finalOffset,    // ✅ Use finalOffset
    url,
  });

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Basic ${toBasicAuthToken(appId, secret)}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    console.error(
      `Planning Center all groups request failed (${response.status}): ${errorText}`
    );
    throw new HttpError(
      `Planning Center request failed with status ${response.status}`,
      502
    );
  }

  const payload = await response.json();
  const groups = mergeIncludedResources(
    payload?.data ?? [],
    payload?.included ?? []
  );


 // ✅ Filter groups by enrollment strategy, enrollment_open, AND auto_closed
  const filteredGroups = [];
  
for (const group of groups) {
  const enrollment = await fetchGroupEnrollment(group.id);
  const strategy = enrollment.strategy;
  
  // ✅ Get auto_closed from merged enrollment data
  const autoClosed = group.enrollment?.attributes?.auto_closed;
  const enrollmentOpen = group.attributes?.enrollment_open ?? true;
  
  if (
    (strategy === 'request_to_join' || strategy === 'open_signup') &&
    enrollmentOpen === true &&
    autoClosed !== true  // ✅ Now will work!
  ) {
    filteredGroups.push({
      ...group,
      enrollmentStrategy: strategy
    });
  }
}




const groupsToReturn = filteredGroups.slice(0, requestedPerPage);

console.log('📊 Pagination Debug:');
console.log('  Fetched from PC:', groups.length);
console.log('  After filtering:', filteredGroups.length);
console.log('  Requested per_page:', requestedPerPage);
console.log('  Returning:', groupsToReturn.length);  // ✅ Now it's defined
console.log('  Offset:', finalOffset);

return {
  page: params.page,
  offset: finalOffset,
  pageSize: requestedPerPage,  // ✅ Use requestedPerPage
  groups: groupsToReturn,  // ✅ Use groupsToReturn
  links: payload?.links ?? {},
  nextExist: filteredGroups.length > requestedPerPage || Boolean(payload?.links?.next),
  includes: payload?.included ?? [],
};
}

async function fetchRegistrationSignups({ page, passthroughParams = [] }) {
  const url = new URL(
    'https://api.planningcenteronline.com/registrations/v2/signups'
  );

  // Filter only non-archived signups
  // url.searchParams.set('where[archived_on]', 'null');
  // url.searchParams.set('include', 'event');
  url.searchParams.set('include', 'event');

  applyPassthroughParams(url, passthroughParams);

  const params = normalizePagination({
    perPageRaw: url.searchParams.get('per_page'),
    offsetRaw: url.searchParams.get('offset'),
    page,
  });

  if (params.perPage !== undefined) {
    ensureSearchParam(url, 'per_page', String(params.perPage));
  }

  if (params.offset !== undefined) {
    ensureSearchParam(url, 'offset', String(params.offset));
  }

  logRequest({
    groupTypeId: 'N/A',
    endpoint: 'registration-signups',
    page: params.page,
    perPage: params.perPage,
    offset: params.offset,
    url,
  });

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Basic ${toBasicAuthToken(appId, secret)}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    console.error(
      `Planning Center signups request failed (${response.status}): ${errorText}`
    );
    throw new HttpError(
      `Planning Center request failed with status ${response.status}`,
      502
    );
  }

  const payload = await response.json();
  
  // Filter signups to ensure archived_on is null
  const filteredSignups = (payload?.data ?? []).filter(
    signup => signup.attributes?.archived_on === null
  );

  return {
  page: params.page,
  offset: params.offset,
  pageSize: params.perPage,
  signups: payload?.data ?? [],        // ✅ payload.data use karo, payload.signups nahi
  links: payload?.links ?? {},
  nextExist: Boolean(payload?.links?.next),
  includes: payload?.included ?? [],
  };
}


function toBasicAuthToken(id, password) {
  return Buffer.from(`${id}:${password}`).toString("base64");
}

async function safeReadText(response) {
  try {
    return await response.text();
  } catch (error) {
    return `Failed to read error body: ${error.message}`;
  }
}

function calculateOffset(page, pageSize) {
  return page * pageSize;
}

function applyPassthroughParams(url, params) {
  params.forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });
}

function ensureSearchParam(url, key, value) {
  if (!url.searchParams.has(key)) {
    url.searchParams.set(key, value);
  }
}

function normalizeParams({ perPageRaw, offsetRaw, startsAtRaw, page }) {
  const pagination = normalizePagination({ perPageRaw, offsetRaw, page });

  return {
    ...pagination,
    startsAt: startsAtRaw ?? undefined,
  };
}

function normalizePagination({ perPageRaw, offsetRaw, page }) {
  const parsedPerPage =
    perPageRaw !== null ? Number.parseInt(perPageRaw, 10) : undefined;
  const hasValidPerPage =
    parsedPerPage !== undefined && !Number.isNaN(parsedPerPage) && parsedPerPage > 0;

  const perPage =
    hasValidPerPage || page !== undefined
      ? (hasValidPerPage ? parsedPerPage : defaultEventsPerPage)
      : undefined;

  const parsedOffset =
    offsetRaw !== null ? Number.parseInt(offsetRaw, 10) : undefined;
  const hasValidOffset =
    parsedOffset !== undefined && !Number.isNaN(parsedOffset) && parsedOffset >= 0;

  const offset =
    hasValidOffset || (page !== undefined && perPage !== undefined)
      ? (hasValidOffset ? parsedOffset : calculateOffset(page, perPage))
      : undefined;

  const derivedPage =
    page !== undefined
      ? page
      : offset !== undefined && perPage
      ? Math.floor(offset / perPage)
      : undefined;

  return {
    perPage,
    offset,
    page: derivedPage,
  };
}

function logRequest({
  groupTypeId,
  page,
  perPage,
  offset,
  startsAt,
  upcoming,
  endpoint = "events",
  url,
}) {
  console.log(
    `[PlanningCenter] Fetching ${endpoint}:`,
    JSON.stringify({
      groupTypeId,
      endpoint,
      page,
      perPage,
      offset,
      startsAt,
      upcoming,
      url: url.toString(),
      decodedUrl: decodeURIComponent(url.toString()),
    })
  );
}

async function enrichEventsWithGroupDetails(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return events;
  }

  const groupIds = Array.from(
    new Set(
      events
        .map(extractGroupId)
        .filter((value) => typeof value === "string" && value.length > 0)
    )
  );

  if (groupIds.length === 0) {
    return events;
  }

  const detailPairs = await Promise.all(
    groupIds.map(async (groupId) => {
      try {
        const detail = await fetchGroupDetail(groupId);
        return [groupId, detail];
      } catch (error) {
        console.error(
          `Failed to fetch group ${groupId} details from Planning Center:`,
          error.message
        );
        return null;
      }
    })
  );

  const detailMap = new Map(
    detailPairs.filter((entry) => Array.isArray(entry) && entry.length === 2)
  );

  return events.map((event) => {
    const groupId = extractGroupId(event);

    if (!groupId) {
      return event;
    }

    const detail = detailMap.get(groupId);

    if (!detail) {
      return event;
    }

    const groupImage = extractGroupImage(detail);

    return {
      ...event,
      groupDetails: detail,
      ...(groupImage ? { groupImage } : {}),
    };
  });
}

async function fetchGroupEnrollment(groupId) {
  const url = `https://api.planningcenteronline.com/groups/v2/groups/${groupId}/enrollment`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${toBasicAuthToken(appId, secret)}`,
      Accept: 'application/json',
    },
  });
if (!response.ok) {
    return { strategy: null, autoClosed: false };
  }

const data = await response.json();
  return {
    strategy: data?.data?.attributes?.strategy || null,
    autoClosed: data?.data?.attributes?.auto_closed || false  // ✅ NEW
  };
}


function extractGroupId(event) {
  return event?.relationships?.group?.data?.id ?? null;
}

async function fetchGroupDetail(groupId) {
  const url = `https://api.planningcenteronline.com/groups/v2/groups/${groupId}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${toBasicAuthToken(appId, secret)}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(
      `Planning Center returned ${response.status} for group ${groupId}: ${errorText}`
    );
  }

  return response.json();
}




function extractGroupImage(detail) {
  const attributes = detail?.data?.attributes ?? {};

  const candidates = [
    attributes?.header_photo?.original,
    attributes?.header_photo?.large,
    attributes?.header_photo?.medium,
    attributes?.photo?.original,
    attributes?.photo?.large,
    attributes?.photo?.medium,
    attributes?.header_photo_url,
    attributes?.photo_url,
  ].filter((value) => typeof value === "string" && value.length > 0);

  return candidates[0] ?? null;
}

function mergeIncludedResources(primaryData, included) {
  if (
    !Array.isArray(primaryData) ||
    primaryData.length === 0 ||
    !Array.isArray(included) ||
    included.length === 0
  ) {
    return primaryData;
  }

  const lookup = new Map(
    included.map((item) => [`${item.type}:${item.id}`, item])
  );

  return primaryData.map((item) => {
    const relationships = item?.relationships;

    if (!relationships || typeof relationships !== "object") {
      return item;
    }

    let enhanced = item;

    Object.entries(relationships).forEach(([relName, relValue]) => {
      if (!relValue || typeof relValue !== "object") {
        return;
      }

      const relData = relValue.data;

      if (!relData) {
        return;
      }

      if (Array.isArray(relData)) {
        const resolved = relData
          .map(({ type, id }) => lookup.get(`${type}:${id}`))
          .filter(Boolean);

        if (resolved.length > 0) {
          if (enhanced === item) {
            enhanced = { ...item };
          }
          enhanced[relName] = resolved;
        }
        return;
      }

      const resolved = lookup.get(`${relData.type}:${relData.id}`);

      if (resolved) {
        if (enhanced === item) {
          enhanced = { ...item };
        }
        enhanced[relName] = resolved;
      }
    });

    return enhanced;
  });
}

module.exports = { fetchUpcomingEvents, fetchGroupsByGroupType, fetchAllGroups, fetchRegistrationSignups };
