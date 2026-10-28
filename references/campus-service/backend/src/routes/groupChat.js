const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const gc = require('../controllers/groupChatController');

router.use(authenticate);

router.get('/groups', gc.getMyGroups);
router.get('/group/:carpoolId/info', gc.getGroupInfo);
router.get('/group/:carpoolId', gc.getGroupMessages);
router.post('/group/:carpoolId', gc.sendGroupMessage);

module.exports = router;
