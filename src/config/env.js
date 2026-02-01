const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const ENV_FILENAME = ".env";
const REQUIRED_ENV_VARS = [
  "PLANNING_CENTER_APP_ID",
  "PLANNING_CENTER_SECRET",
];

const envPath = path.join(__dirname, "..", "..", ENV_FILENAME);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(", ")}`
  );
}

const config = {
  planningCenter: {
    appId: process.env.PLANNING_CENTER_APP_ID,
    secret: process.env.PLANNING_CENTER_SECRET,
    eventsPerPage: normalizeEventsPerPage(
      process.env.PLANNING_CENTER_EVENTS_PER_PAGE
    ),
  },
  server: {
    port: Number.parseInt(process.env.PORT || "3000", 10),
  },
};

function normalizeEventsPerPage(rawValue) {
  const parsed = Number.parseInt(rawValue || "3", 10);
  return Number.isNaN(parsed) || parsed <= 0 ? 3 : parsed;
}

module.exports = { config };
