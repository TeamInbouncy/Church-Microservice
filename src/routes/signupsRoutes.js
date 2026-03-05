const express = require("express");
const {
  getRegistrationSignups,
  getFeaturedRegistrationSignups,
} = require("../controllers/signupsController");

const router = express.Router();

router.get("/featured", getFeaturedRegistrationSignups);
router.get("/", getRegistrationSignups);

module.exports = router;
