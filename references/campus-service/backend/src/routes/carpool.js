const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const carpoolController = require('../controllers/carpoolController');

// 获取拼车列表（可选登录）
router.get('/', optionalAuth, carpoolController.getList);

// 以下接口需要登录
router.use(authenticate);

// 我发布的（必须在 /:id 之前）
router.get('/my/published', carpoolController.getMyPublished);

// 我参与的
router.get('/my/joined', carpoolController.getMyJoined);

// 我收藏的
router.get('/my/favorites', carpoolController.getMyFavorites);

// 获取拼车详情（可选登录）
router.get('/:id', optionalAuth, carpoolController.getDetail);

// 发布拼车
router.post('/', carpoolController.create);

// 更新拼车
router.put('/:id', carpoolController.update);

// 删除（取消）拼车
router.delete('/:id', carpoolController.remove);

// 加入拼车
router.post('/:id/join', carpoolController.join);

// 取消加入
router.post('/:id/cancel', carpoolController.cancelJoin);

// 结束拼车
router.post('/:id/end', carpoolController.endCarpool);

// 收藏拼车
router.post('/:id/favorite', carpoolController.favorite);

// 取消收藏
router.delete('/:id/favorite', carpoolController.unfavorite);

module.exports = router;
