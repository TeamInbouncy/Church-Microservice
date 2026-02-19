const express = require("express");
const { getRegistrationSignups } = require("../controllers/signupsController");

const router = express.Router();

router.get("/", getRegistrationSignups);

module.exports = router;
