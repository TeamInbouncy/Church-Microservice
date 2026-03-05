const { HttpError } = require("../utils/httpError");
const {
  fetchRegistrationSignups,
  fetchFeaturedRegistrationSignups,
} = require("../services/planningCenterService");

async function getRegistrationSignups(req, res, next) {
  try {
    const { passthroughParams, page } = extractPlanningCenterQuery(req);
    const result = await fetchRegistrationSignups({
      page,
      passthroughParams,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getFeaturedRegistrationSignups(req, res, next) {
  try {
    const mode = parseFeaturedMode(req.query?.mode, req.query?.first_only);
    const { passthroughParams, page } = extractPlanningCenterQuery(req, {
      excludeKeys: ["mode", "first_only"],
    });
    const result = await fetchFeaturedRegistrationSignups({
      page,
      passthroughParams,
    });

    if (mode === "first") {
      const signups = Array.isArray(result.signups)
        ? result.signups.slice(0, 1)
        : [];
      const hasAdditionalLocalItems =
        Array.isArray(result.signups) && result.signups.length > 1;

      res.json({
        ...result,
        signups,
        pageSize: signups.length === 1 ? 1 : result.pageSize,
        nextExist: Boolean(result.nextExist) || hasAdditionalLocalItems,
      });
      return;
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
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

function parseFeaturedMode(rawMode, rawFirstOnly) {
  if (rawFirstOnly !== undefined) {
    const normalizedFirstOnly = String(rawFirstOnly).trim().toLowerCase();
    if (["1", "true", "yes"].includes(normalizedFirstOnly)) {
      return "first";
    }
    if (["0", "false", "no"].includes(normalizedFirstOnly)) {
      return "all";
    }
    throw new HttpError("first_only must be true or false", 400);
  }

  if (rawMode === undefined) {
    return "all";
  }

  const normalizedMode = String(rawMode).trim().toLowerCase();
  if (normalizedMode === "all" || normalizedMode === "first") {
    return normalizedMode;
  }

  throw new HttpError('mode must be "all" or "first"', 400);
}

function extractPlanningCenterQuery(req, { excludeKeys = [] } = {}) {
  const queryString = req.originalUrl.split("?")[1] ?? "";
  const searchParams = new URLSearchParams(queryString);
  const passthroughParams = [];
  const excludedQueryKeys = new Set(excludeKeys);
  let page;

  for (const [key, value] of searchParams.entries()) {
    if (key === "page") {
      page = parsePage(value);
      continue;
    }

    if (excludedQueryKeys.has(key)) {
      continue;
    }

    passthroughParams.push([key, value]);
  }

  return { passthroughParams, page };
}

module.exports = { getRegistrationSignups, getFeaturedRegistrationSignups };
