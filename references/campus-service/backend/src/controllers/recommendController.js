const { Carpool, HotRoute, User } = require('../models');
const { AppError } = require('../middleware/auth');

// 常用地点坐标库（校园相关）
const LOCATION_DB = {
  '{{SCHOOL_NAME}}': { lat: 36.6071, lng: 114.5048 },
  '{{SCHOOL_CITY}}东站': { lat: 36.6112, lng: 114.5499 },
  '{{SCHOOL_CITY}}站': { lat: 36.6013, lng: 114.4834 },
  '{{SCHOOL_CITY}}机场': { lat: 36.5271, lng: 114.4113 },
  '{{SCHOOL_CITY}}汽车客运总站': { lat: 36.6005, lng: 114.4841 },
  '{{SCHOOL_CITY}}学院': { lat: 36.5968, lng: 114.5069 },
  '{{SCHOOL_CITY}}职业技术学院': { lat: 36.6145, lng: 114.4801 },
  '美乐城': { lat: 36.6102, lng: 114.5102 },
  '新世纪广场': { lat: 36.6035, lng: 114.4958 },
  '万达广场': { lat: 36.6128, lng: 114.5185 },
};

/**
 * 获取地点坐标（先查库，后返回默认值）
 */
const getLocation = (name) => {
  // 精确匹配
  if (LOCATION_DB[name]) return LOCATION_DB[name];

  // 模糊匹配
  for (const [key, value] of Object.entries(LOCATION_DB)) {
    if (name.includes(key) || key.includes(name)) {
      return value;
    }
  }

  return null;
};

/**
 * 计算两点间的距离（Haversine公式）
 * @returns {number} 距离（公里）
 */
const calcDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // 地球半径
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

/**
 * 估算行驶时间
 * @param {number} distanceKm - 距离（公里）
 * @returns {number} 预估时间（分钟）
 */
const calcDuration = (distanceKm) => {
  // 城市道路平均速度约30km/h，高速公路约60km/h
  // 简化为混合速度40km/h
  const avgSpeed = 40;
  return Math.round((distanceKm / avgSpeed) * 60);
};

// ==================== 首页推荐 ====================

/**
 * 热门路线（首页推荐）
 * GET /api/recommend/hot-routes
 */
exports.getHotRoutes = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    // 从 HotRoute 表获取热门路线
    let routes = await HotRoute.find()
      .sort({ popularityScore: -1 })
      .limit(parseInt(limit))
      .lean();

    // 如果 HotRoute 为空，实时聚合
    if (routes.length === 0) {
      const [aggRoutes] = await require('../config/db')().query(
      `SELECT from_place as 'from', to_place as 'to', COUNT(*) as count, AVG(price) as avgPrice
       FROM carpools
       WHERE status IN ('active', 'full', 'ended')
       GROUP BY from_place, to_place
       ORDER BY count DESC
       LIMIT ?`,
      [parseInt(limit)]
    );

    routes = aggRoutes.map(r => ({
      from: r.from,
      to: r.to,
      totalCount: r.count,
      avgPrice: Math.round(r.avgPrice * 100) / 100,
      popularityScore: r.count * 10,
    }));
    }

    // 为每条路线计算预估距离和时间
    const result = routes.map((r) => {
      const fromLoc = getLocation(r.from);
      const toLoc = getLocation(r.to);
      let distance = r.estimatedDistance || null;
      let duration = r.estimatedDuration || null;

      if (fromLoc && toLoc && !distance) {
        distance = calcDistance(fromLoc.lat, fromLoc.lng, toLoc.lat, toLoc.lng);
        duration = calcDuration(distance);
      }

      return {
        from: r.from,
        to: r.to,
        count: r.totalCount || r.count || 0,
        avgPrice: r.avgPrice || 0,
        popularityScore: r.popularityScore || 0,
        estimatedDistance: distance,
        estimatedDuration: duration,
      };
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 距离与时长预估
 * GET /api/recommend/estimate?from=xxx&to=xxx
 */
exports.estimate = async (req, res, next) => {
  try {
    const { from, to, fromLat, fromLng, toLat, toLng } = req.query;

    if (!from || !to) {
      throw new AppError('请提供出发地和目的地', 400);
    }

    let lat1, lng1, lat2, lng2;

    // 优先使用传入的坐标
    if (fromLat && fromLng) {
      lat1 = parseFloat(fromLat);
      lng1 = parseFloat(fromLng);
    } else {
      const loc = getLocation(from);
      if (loc) {
        lat1 = loc.lat;
        lng1 = loc.lng;
      }
    }

    if (toLat && toLng) {
      lat2 = parseFloat(toLat);
      lng2 = parseFloat(toLng);
    } else {
      const loc = getLocation(to);
      if (loc) {
        lat2 = loc.lat;
        lng2 = loc.lng;
      }
    }

    if (lat1 === undefined || lat2 === undefined) {
      return res.json({
        success: true,
        data: {
          distance: null,
          duration: null,
          message: '无法预估，请提供坐标或使用已知地点',
        },
      });
    }

    const distance = calcDistance(lat1, lng1, lat2, lng2);
    const duration = calcDuration(distance);

    // 查找该路线在平台上的拼车数量
    const routeCount = await Carpool.countDocuments({
      from: new RegExp(from, 'i'),
      to: new RegExp(to, 'i'),
      status: { $in: ['active', 'full'] },
    });

    // 平均价格
    const [avgPriceResult] = await require('../config/db')().query(
      'SELECT AVG(price) as avgPrice FROM carpools WHERE from_place LIKE ? AND to_place LIKE ? AND status IN (?, ?)',
      ['%' + from + '%', '%' + to + '%', 'active', 'full']
    );

    res.json({
      success: true,
      data: {
        from,
        to,
        distance,
        duration,
        distanceText: distance ? `${distance} 公里` : '未知',
        durationText: duration ? `约 ${duration} 分钟` : '未知',
        activeCarpools: routeCount,
        avgPrice: avgPriceResult[0]?.avgPrice
          ? Math.round(avgPriceResult[0].avgPrice * 100) / 100(avgPriceResult[0].avgPrice * 100) / 100
          : 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 就近匹配
 * GET /api/recommend/nearby?from=xxx&radius=5
 * 找离出发地最近的拼车
 */
exports.nearby = async (req, res, next) => {
  try {
    const { from, lat, lng, radius = 10, limit = 20 } = req.query;

    if (!from) {
      throw new AppError('请提供出发地', 400);
    }

    let centerLat, centerLng;

    if (lat && lng) {
      centerLat = parseFloat(lat);
      centerLng = parseFloat(lng);
    } else {
      const loc = getLocation(from);
      if (loc) {
        centerLat = loc.lat;
        centerLng = loc.lng;
      }
    }

    // 获取活跃拼车
    const carpools = await Carpool.find({
      status: { $in: ['active', 'full'] },
    })
      .sort({ createTime: -1 })
      .limit(200) // 先取200条再本地计算距离
      .populate('creator', 'nickName avatarUrl creditScore')
      .lean();

    const radiusKm = parseFloat(radius);
    const results = [];

    for (const c of carpools) {
      let distance = null;

      if (centerLat !== undefined) {
        const fromLoc = getLocation(c.from);
        if (fromLoc) {
          distance = calcDistance(centerLat, centerLng, fromLoc.lat, fromLoc.lng);
        }
      } else {
        // 无坐标时按名称匹配算权重
        const fromLoc1 = getLocation(from);
        const fromLoc2 = getLocation(c.from);
        if (fromLoc1 && fromLoc2) {
          distance = calcDistance(fromLoc1.lat, fromLoc1.lng, fromLoc2.lat, fromLoc2.lng);
        }
      }

      if (distance === null || distance <= radiusKm) {
        results.push({
          ...c,
          distance: distance,
          distanceText: distance ? `${distance} 公里` : '未知',
        });
      }
    }

    // 按距离排序
    results.sort((a, b) => (a.distance || 999) - (b.distance || 999));

    res.json({
      success: true,
      data: {
        center: from,
        radius: radiusKm,
        total: results.length,
        list: results.slice(0, parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 个人推荐（基于用户偏好和历史）
 * GET /api/recommend/for-me
 */
exports.forMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);

    // 获取用户最近参与的拼车路线
    const pool = require('../config/db')();
  const [recentRoutes] = await pool.query(
    `SELECT from_place as \`from\`, to_place as \`to\`, COUNT(*) as count
     FROM carpools
     WHERE creator_id = ? 
        OR id IN (SELECT carpool_id FROM carpool_participants WHERE user_id = ?)
     GROUP BY from_place, to_place
     ORDER BY MAX(createTime) DESC
     LIMIT 10`,
    [req.userId, req.userId]
  );

    // 根据历史路线推荐相似路线
    const recommendedRoutes = new Set();
    const recommended = [];

    for (const route of recentRoutes) {
      const similar = await Carpool.find({
        $or: [
          { from: new RegExp(route.from, 'i'), status: { $in: ['active', 'full'] } },
          { to: new RegExp(route.to, 'i'), status: { $in: ['active', 'full'] } },
        ],
        creator: { $ne: req.userId },
        'participants.user': { $ne: req.userId },
      })
        .sort({ createTime: -1 })
        .limit(5)
        .populate('creator', 'nickName avatarUrl creditScore')
        .lean();

      for (const c of similar) {
        const key = c._id.toString();
        if (!recommendedRoutes.has(key)) {
          recommendedRoutes.add(key);
          recommended.push(c);
        }
      }
    }

    // 如果推荐不足，补充热门路线
    if (recommended.length < 10) {
      const hot = await Carpool.find({
        status: { $in: ['active', 'full'] },
        creator: { $ne: req.userId },
        'participants.user': { $ne: req.userId },
        _id: { $nin: recommended.map((r) => r._id) },
      })
        .sort({ viewCount: -1, createTime: -1 })
        .limit(10 - recommended.length)
        .populate('creator', 'nickName avatarUrl creditScore')
        .lean();

      recommended.push(...hot);
    }

    res.json({
      success: true,
      data: {
        list: recommended.slice(0, 20),
        total: recommended.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新热门路线统计（每次发布/完成拼车时调用）
 */
exports.updateHotRoute = async (from, to) => {
  try {
    const fromLoc = getLocation(from);
    const toLoc = getLocation(to);

    let distance = null;
    let duration = null;
    if (fromLoc && toLoc) {
      distance = calcDistance(fromLoc.lat, fromLoc.lng, toLoc.lat, toLoc.lng);
      duration = calcDuration(distance);
    }

    await HotRoute.findOneAndUpdate(
      { from, to },
      {
        $inc: {
          totalCount: 1,
          weekCount: 1,
          monthCount: 1,
          popularityScore: 10,
        },
        $set: {
          lastUsedAt: new Date(),
          estimatedDistance: distance,
          estimatedDuration: duration,
          fromLat: fromLoc?.lat || null,
          fromLng: fromLoc?.lng || null,
          toLat: toLoc?.lat || null,
          toLng: toLoc?.lng || null,
        },
      },
      { upsert: true }
    );
  } catch (err) {
    console.error('更新热门路线失败:', err.message);
  }
};

/**
 * 获取地点坐标库
 * GET /api/recommend/locations
 */
exports.getLocations = async (req, res, next) => {
  res.json({
    success: true,
    data: LOCATION_DB,
  });
};
