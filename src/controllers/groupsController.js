const { HttpError } = require("../utils/httpError");
// Line 2 ko exactly aise karo:
const { 
  fetchGroupsByGroupType,
  fetchAllGroups 
} = require("../services/planningCenterService");

async function listGroupsByGroupType(req, res, next) {
  try {
    const groupTypeId = parseGroupTypeId(req.params.groupTypeId);
    const { passthroughParams, page } = extractPlanningCenterQuery(req);

    const result = await fetchGroupsByGroupType({
      groupTypeId,
      page,
      passthroughParams,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}


// Line 19 ke baad add karo:

async function listAllGroups(req, res, next) {
  try {
    const { passthroughParams, page } = extractPlanningCenterQuery(req);

    const result = await fetchAllGroups({
      page,
      passthroughParams,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}


function parseGroupTypeId(rawValue) {
  if (rawValue === undefined || rawValue === null) {
    throw new HttpError("groupTypeId is required", 400);
  }

  const value = String(rawValue).trim();

  if (!/^\d+$/.test(value)) {
    throw new HttpError("groupTypeId must be a positive integer", 400);
  }

  return value;
}

function extractPlanningCenterQuery(req) {
  const queryString = req.originalUrl.split("?")[1] ?? "";
  const searchParams = new URLSearchParams(queryString);
  const passthroughParams = [];
  let page;

  for (const [key, value] of searchParams.entries()) {
    if (key === "page") {
      page = parsePage(value);
      continue;
    }

    passthroughParams.push([key, value]);
  }

  return { passthroughParams, page };
}

function parsePage(rawValue) {
  if (rawValue === undefined) {
    return undefined;
  }

  const value = Number.parseInt(String(rawValue), 10);

  if (Number.isNaN(value) || value < 0) {
    throw new HttpError("page must be a non-negative integer", 400);
  }

  return value;
}

module.exports = { listGroupsByGroupType, listAllGroups };
