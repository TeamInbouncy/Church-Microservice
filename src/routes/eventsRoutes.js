const express = require("express");
const {
  getUpcomingEventsByGroupType,
} = require("../controllers/eventsController");

const router = express.Router();

router.get("/grouptype/:groupTypeId", getUpcomingEventsByGroupType);

module.exports = router;
