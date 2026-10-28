const jwt = require('jsonwebtoken');
const { Admin } = require('../models');
const { AppError } = require('./auth');

/**
 * 管理员 JWT 认证中间件
 */
const adminAuth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '请先登录管理员账号',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.adminId) {
      return res.status(403).json({
        success: false,
        message: '此接口仅限管理员访问',
      });
    }

    const admin = await Admin.findById(decoded.adminId);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: '管理员账号不存在',
      });
    }

    if (admin.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: '管理员账号已被禁用',
      });
    }

    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      const remaining = Math.ceil((admin.lockedUntil - new Date()) / 60000);
      return res.status(403).json({
        success: false,
        message: `账号已被锁定，请${remaining}分钟后再试`,
      });
    }

    req.admin = admin;
    req.adminId = admin._id;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * 权限检查中间件工厂
 * @param {string|string[]} permissions - 需要的权限
 */
const requirePermission = (permissions) => {
  const requiredPerms = Array.isArray(permissions) ? permissions : [permissions];

  return (req, res, next) => {
    const admin = req.admin;

    if (!admin) {
      return res.status(403).json({
        success: false,
        message: '未授权访问',
      });
    }

    // 超管和拥有 * 权限的管理员拥有所有权限
    if (admin.role === 'super_admin') return next();
    if (admin.permissions.includes('*')) return next();

    // 检查是否拥有所有需要的权限
    const hasAll = requiredPerms.every((p) => admin.permissions.includes(p));

    if (!hasAll) {
      return res.status(403).json({
        success: false,
        message: '权限不足',
      });
    }

    next();
  };
};

/**
 * 生成管理员 Token
 */
const generateAdminToken = (adminId) => {
  return jwt.sign({ adminId, type: 'admin' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '12h',
  });
};

/**
 * 记录管理员操作日志
 */
const logOperation = (module, action, description, detail = {}) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      // 异步写日志，不阻塞响应
      setImmediate(async () => {
        try {
          const { OperationLog } = require('../models');
          await OperationLog.create({
            operator: req.admin?._id || null,
            operatorName: req.admin?.nickName || '未知',
            operatorRole: req.admin?.role || '',
            module,
            action,
            description,
            detail,
            targetType: detail.targetType || '',
            targetId: detail.targetId || null,
            targetName: detail.targetName || '',
            ip: req.ip || req.connection?.remoteAddress || '',
            userAgent: req.headers['user-agent'] || '',
            method: req.method,
            path: req.originalUrl,
            result: body?.success !== false ? 'success' : 'failure',
            errorMessage: body?.message || '',
          });
        } catch (err) {
          console.error('记录操作日志失败:', err.message);
        }
      });

      return originalJson(body);
    };

    next();
  };
};

module.exports = {
  adminAuth,
  requirePermission,
  generateAdminToken,
  logOperation,
};
