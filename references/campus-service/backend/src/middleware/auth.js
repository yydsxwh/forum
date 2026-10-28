const jwt = require('jsonwebtoken');
const { User } = require('../models');

// JWT_SECRET 必须从环境变量提供，不允许硬编码 fallback
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET 未设置，请在 .env 中配置');
  process.exit(1);
}

/**
 * JWT 认证中间件 - 必需登录
 */
const authenticate = async (req, res, next) => {
  try {
    let token;

    // 从 Authorization 头获取 token
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '请先登录',
      });
    }

    // 验证 token
    const decoded = jwt.verify(token, JWT_SECRET);

    // 查找用户
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在',
      });
    }

    // 检查是否被临时封禁且已到期 → 自动解封并恢复5信用分
    if (user.status === 'disabled' && user.banExpiresAt && new Date() > new Date(user.banExpiresAt)) {
      // 恢复账号
      user.status = 'active';
      // 恢复5信用分
      const INITIAL_CREDIT = parseInt(process.env.INITIAL_CREDIT) || 100;
      const RECOVERY_CREDIT = 5;
      const oldScore = user.creditScore || INITIAL_CREDIT;
      user.creditScore = Math.min(110, oldScore + RECOVERY_CREDIT);
      // 清除封禁到期时间
      user.banExpiresAt = null;
      await user.save();
      // 创建信用分变更通知
      const { Notification } = require('../models');
      await Notification.create({
        recipient: user._id,
        sender: null,
        senderSnapshot: { nickName: '系统', avatarUrl: '' },
        type: 'credit_change',
        title: '信用分恢复',
        content: `封禁到期，自动恢复 ${RECOVERY_CREDIT} 信用分`,
        priority: 'normal',
        extraData: { oldScore, newScore: user.creditScore, reason: '封禁到期自动恢复' },
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: '账号已被临时封禁，封禁到期后自动解封',
      });
    }

    // 将用户信息挂载到 req
    req.user = user;
    req.userId = user._id;
    req.userIdCode = user.user_id_code;   // 6 位数唯一标识（举报/查找用）
    next();
  } catch (error) {
    // Token 无效（签名不匹配/过期）→ 返回 401 让前端清除旧 token
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '登录已过期，请重新登录',
        code: 'TOKEN_EXPIRED',
      });
    }
    next(error);
  }
};

/**
 * 可选认证 - 不强制登录，但如果有 token 就解析
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId);
      if (user && user.status === 'active') {
        req.user = user;
        req.userId = user._id;
        req.userIdCode = user.user_id_code;   // 6 位数唯一标识
      }
    }

    next();
  } catch {
    // Token 无效也继续，不报错
    next();
  }
};

/**
 * 生成 JWT Token
 */
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * 生成 Refresh Token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
};

/**
 * 业务错误类
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  authenticate,
  optionalAuth,
  generateToken,
  generateRefreshToken,
  AppError,
};
