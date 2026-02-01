const { HttpError } = require("../utils/httpError");
const { fetchUpcomingEvents } = require("../services/planningCenterService");

async function getUpcomingEventsByGroupType(req, res, next) {
  try {
    const groupTypeId = parseGroupTypeId(req.params.groupTypeId);
    const { passthroughParams, page, upcoming } =
      extractPlanningCenterQuery(req);
    const result = await fetchUpcomingEvents({
      page,
      groupTypeId,
      upcoming,
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

function extractPlanningCenterQuery(req) {
  const queryString = req.originalUrl.split("?")[1] ?? "";
  const searchParams = new URLSearchParams(queryString);
  const passthroughParams = [];
  let page;
  let upcoming = false;

  for (const [key, value] of searchParams.entries()) {
    if (key === "page") {
      page = parsePage(value);
      continue;
    }

    if (key === "upcoming") {
      upcoming = parseUpcoming(value);
      continue;
    }

    passthroughParams.push([key, value]);
  }

  return { passthroughParams, page, upcoming };
}

function parseUpcoming(rawValue) {
  const value = String(rawValue ?? "").trim().toLowerCase();

  if (value === "" || value === "true" || value === "1" || value === "yes") {
    return true;
  }

  if (value === "false" || value === "0" || value === "no") {
    return false;
  }

  throw new HttpError(
    "upcoming must be a boolean-like value (true/false)",
    400
  );
}

module.exports = { getUpcomingEventsByGroupType };
