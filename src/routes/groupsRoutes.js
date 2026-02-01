const express = require("express");
const { 
  listGroupsByGroupType,
  listAllGroups  // Ye add karo
} = require('../controllers/groupsController');

const router = express.Router();

router.get('/', listAllGroups); 

router.get('/grouptype/:groupTypeId', listGroupsByGroupType);

module.exports = router;
