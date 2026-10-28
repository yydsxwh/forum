const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const userController = require('../controllers/userController');

// 所有用户路由需要登录
router.use(authenticate);

// 搜索用户
router.get('/search', userController.searchUsers);

// 获取个人统计
router.get('/statistics', userController.getStatistics);

// 获取个人信息
router.get('/profile', userController.getProfile);

// 获取指定用户公开资料
router.get('/profile/:userId', userController.getPublicProfile);

// 更新个人信息
router.put('/profile', userController.updateProfile);

// 绑定手机号
router.put('/bind-phone', userController.bindPhone);

// 绑定微信
router.put('/bind-wechat', userController.bindWechat);

// 更新信用分
router.put('/credit', userController.updateCredit);

// 获取信用变动记录
router.get('/credit-records', userController.getCreditRecords);

module.exports = router;
