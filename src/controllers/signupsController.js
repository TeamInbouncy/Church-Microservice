const { HttpError } = require("../utils/httpError");
const { fetchRegistrationSignups } = require("../services/planningCenterService");

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

  for (const [key, value] of searchParams.entries()) {
    if (key === "page") {
      page = parsePage(value);
      continue;
    }

    passthroughParams.push([key, value]);
  }

  return { passthroughParams, page };
}

module.exports = { getRegistrationSignups };
