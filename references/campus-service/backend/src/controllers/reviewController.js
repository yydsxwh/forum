const { Review, Carpool, User, Notification } = require('../models');
const { AppError } = require('../middleware/auth');

/**
 * 创建评价
 * POST /api/reviews
 */
exports.create = async (req, res, next) => {
  try {
    const {
      targetUserId,
      carpoolId,
      rating,
      content,
      tags,
      reviewType,
      isAnonymous,
    } = req.body;

    if (!targetUserId || !carpoolId || !rating || !reviewType) {
      throw new AppError('缺少必要参数', 400);
    }

    if (rating < 1 || rating > 5) {
      throw new AppError('评分范围为1-5分', 400);
    }

    // 不能评价自己
    if (targetUserId === req.userId.toString()) {
      throw new AppError('不能评价自己', 400);
    }

    // 检查拼车是否存在且已结束
    const carpool = await Carpool.findById(carpoolId);
    if (!carpool) {
      throw new AppError('拼车信息不存在', 404);
    }

    // 检查是否参与了这个拼车（发布者或参与者）
    const isCreator = carpool.creator.toString() === req.userId.toString();
    const isParticipant = carpool.participants.some(
      (p) => p.user.toString() === req.userId.toString() && p.status === 'joined'
    );

    if (!isCreator && !isParticipant) {
      throw new AppError('你未参与此拼车，无法评价', 403);
    }

    // 检查被评价者是否也参与了这个拼车
    const targetIsCreator = carpool.creator.toString() === targetUserId;
    const targetIsParticipant = carpool.participants.some(
      (p) => p.user.toString() === targetUserId && p.status === 'joined'
    );

    if (!targetIsCreator && !targetIsParticipant) {
      throw new AppError('被评价者未参与此拼车', 400);
    }

    // 检查是否已经评价过
    const existingReview = await Review.findOne({
      reviewer: req.userId,
      carpool: carpoolId,
    });
    if (existingReview) {
      throw new AppError('你已经评价过了', 400);
    }

    // 创建评价
    const review = await Review.create({
      reviewer: req.userId,
      reviewerSnapshot: {
        nickName: isAnonymous ? '匿名用户' : req.user.nickName,
        avatarUrl: isAnonymous ? '' : req.user.avatarUrl,
      },
      targetUser: targetUserId,
      carpool: carpoolId,
      rating,
      content: content || '',
      tags: tags || [],
      reviewType,
      isAnonymous: isAnonymous || false,
    });

    // 更新用户评价统计
    await Review.updateUserStats(targetUserId);

    // 更新信用分：好评给被评价者+3，差评给被评价者-5
    const INITIAL_CREDIT = parseInt(process.env.INITIAL_CREDIT) || 100;
    const GOOD_REVIEW_BONUS = parseInt(process.env.GOOD_REVIEW_BONUS) || 3;
    const BAD_REVIEW_PENALTY = parseInt(process.env.BAD_REVIEW_PENALTY) || 5;
    const targetUser = await User.findById(targetUserId);
    if (targetUser) {
      const oldScore = targetUser.creditScore || INITIAL_CREDIT;
      let newScore = oldScore;
      let reason = '';
      if (rating >= 4) {
        // 好评 +3分
        newScore = Math.min(110, oldScore + GOOD_REVIEW_BONUS);
        reason = `获得好评，信用分+${GOOD_REVIEW_BONUS}`;
      } else if (rating <= 2) {
        // 差评 -5分
        newScore = Math.max(0, oldScore - BAD_REVIEW_PENALTY);
        reason = `获得差评，信用分-${BAD_REVIEW_PENALTY}`;
      }
      if (newScore !== oldScore) {
        targetUser.creditScore = newScore;

        // 自动封禁规则：信用分低于 80 分 → 自动临时封禁 1 个月
        if (targetUser.creditScore < 80 && targetUser.status === 'active') {
          const banExpiresAt = new Date();
          banExpiresAt.setMonth(banExpiresAt.getMonth() + 1);
          targetUser.status = 'disabled';
          targetUser.banExpiresAt = banExpiresAt;
        }

        await targetUser.save();
        // 创建信用分变更通知
        await Notification.create({
          recipient: targetUserId,
          sender: req.userId,
          senderSnapshot: {
            nickName: isAnonymous ? '匿名用户' : req.user.nickName,
            avatarUrl: isAnonymous ? '' : req.user.avatarUrl,
          },
          type: 'credit_change',
          title: '信用分变更',
          content: reason,
          priority: 'normal',
          extraData: { oldScore, newScore, reason },
        });
      }
    }

    // 通知被评价者
    await Notification.create({
      recipient: targetUserId,
      sender: req.userId,
      senderSnapshot: {
        nickName: isAnonymous ? '匿名用户' : req.user.nickName,
        avatarUrl: isAnonymous ? '' : req.user.avatarUrl,
      },
      type: 'new_review',
      title: '收到新评价',
      content: `${isAnonymous ? '匿名用户' : req.user.nickName} 给你打了 ${rating} 分${content ? '：' + content : ''}`,
      relatedCarpool: carpoolId,
      relatedReview: review._id,
      priority: 'normal',
    });

    res.status(201).json({
      success: true,
      message: '评价成功',
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 查看用户评价
 * GET /api/reviews/user/:userId
 */
exports.getUserReviews = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;

    const query = {
      targetUser: req.params.userId,
      isReported: false,
    };

    const [list, total] = await Promise.all([
      Review.find(query)
        .sort({ createTime: -1 })
        .skip((parseInt(page) - 1) * parseInt(pageSize))
        .limit(parseInt(pageSize))
        .populate('reviewer', 'nickName avatarUrl creditScore')
        .populate('carpool', 'from to departureTime'),
      Review.countDocuments(query),
    ]);

    // 匿名评价隐藏评价者信息
    const safeList = list.map((review) => {
      const obj = review.toObject();
      if (review.isAnonymous && obj.reviewer) {
        obj.reviewer.nickName = '匿名用户';
        obj.reviewer.avatarUrl = '';
      }
      return obj;
    });

    // 统计评价分布
    const [stats] = await require('../config/db')().query(
    'SELECT rating as _id, COUNT(*) as count FROM reviews WHERE targetUser_id = ? AND isReported = 0 GROUP BY rating ORDER BY _id DESC',
    [req.params.userId]
  );

    const ratingDistribution = {};
    stats.forEach((s) => {
      ratingDistribution[s._id] = s.count;
    });

    res.json({
      success: true,
      data: {
        list: safeList,
        total,
        ratingDistribution,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / parseInt(pageSize)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 我的评价（我给出的评价）
 * GET /api/reviews/my
 */
exports.getMyReviews = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;

    const [list, total] = await Promise.all([
      Review.find({ reviewer: req.userId })
        .sort({ createTime: -1 })
        .skip((parseInt(page) - 1) * parseInt(pageSize))
        .limit(parseInt(pageSize))
        .populate('targetUser', 'nickName avatarUrl')
        .populate('carpool', 'from to departureTime'),
      Review.countDocuments({ reviewer: req.userId }),
    ]);

    res.json({
      success: true,
      data: {
        list,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / parseInt(pageSize)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除评价
 * DELETE /api/reviews/:id
 */
exports.remove = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      throw new AppError('评价不存在', 404);
    }

    if (review.reviewer.toString() !== req.userId.toString()) {
      throw new AppError('只能删除自己的评价', 403);
    }

    await review.deleteOne();

    // 重新计算被评价者的统计
    await Review.updateUserStats(review.targetUser);

    res.json({
      success: true,
      message: '评价已删除',
    });
  } catch (error) {
    next(error);
  }
};
