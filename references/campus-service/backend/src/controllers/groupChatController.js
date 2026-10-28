const { Message, Carpool, User } = require('../models');
const { AppError } = require('../middleware/auth');

/**
 * 检查用户是否为拼车成员（创建者 或 参与者）
 */
function isCarpoolMember(carpool, userId) {
  const creatorId = carpool.creator?._id || carpool.creator;
  if (creatorId && creatorId.toString() === userId.toString()) return true;
  return carpool.participants.some(
    p => p.user && p.user.toString() === userId.toString() && p.status === 'joined'
  );
}

/**
 * 获取我的群聊列表（我创建或参与的拼车群）
 * GET /api/messages/groups
 */
exports.getMyGroups = async (req, res, next) => {
  try {
    const pool = require('../config/db')();
    // 查询我创建的或我参与的拼车
    const [rows] = await pool.query(
      `SELECT c.* FROM carpools c
       WHERE c.creator_id = ?
       UNION
       SELECT c.* FROM carpools c
       INNER JOIN carpool_participants cp ON cp.carpool_id = c.id
       WHERE cp.user_id = ? AND cp.status = 'joined'`,
      [req.userId, req.userId]
    );

    const groups = [];
    for (const carpool of rows) {
      // 查参与者
      const [participants] = await pool.query(
        `SELECT cp.*, u.nickName, u.avatarUrl FROM carpool_participants cp
         INNER JOIN users u ON cp.user_id = u.id
         WHERE cp.carpool_id = ? AND cp.status = 'joined'`,
        [carpool.id]
      );
      // 查创建者信息
      const [creators] = await pool.query(
        'SELECT id, nickName, avatarUrl FROM users WHERE id = ?',
        [carpool.creator_id]
      );
      const creator = creators[0];

      const members = participants.map(p => ({
        _id: p.user_id,
        nickName: p.nickName,
        avatarUrl: p.avatarUrl || '',
      }));
      // 如果创建者不在参与者列表中，加入
      if (creator && !members.some(m => String(m._id) === String(creator.id))) {
        members.unshift({
          _id: creator.id,
          nickName: creator.nickName,
          avatarUrl: creator.avatarUrl || '',
        });
      }

      groups.push({
        carpoolId: carpool.id,
        from: carpool.from_place,
        to: carpool.to_place,
        departureTime: carpool.departureTime,
        status: carpool.status,
        memberCount: members.length,
        members: members.slice(0, 10),
      });
    }

    res.json({ success: true, data: groups });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取群聊信息
 * GET /api/messages/group/:carpoolId/info
 */
exports.getGroupInfo = async (req, res, next) => {
  try {
    const pool = require('../config/db')();
    const carpoolId = req.params.carpoolId;

    const [carpoolRows] = await pool.query('SELECT * FROM carpools WHERE id = ?', [carpoolId]);
    if (carpoolRows.length === 0) throw new AppError('拼车不存在', 404);
    const carpool = carpoolRows[0];

    // 查创建者
    const [creators] = await pool.query('SELECT id, nickName, avatarUrl FROM users WHERE id = ?', [carpool.creator_id]);
    const creator = creators[0];

    // 查参与者
    const [participants] = await pool.query(
      `SELECT cp.*, u.nickName, u.avatarUrl FROM carpool_participants cp
       INNER JOIN users u ON cp.user_id = u.id
       WHERE cp.carpool_id = ? AND cp.status = 'joined'`,
      [carpoolId]
    );

    const members = participants.map(p => ({
      _id: p.user_id,
      nickName: p.nickName,
      avatarUrl: p.avatarUrl || '',
    }));
    if (creator && !members.some(m => String(m._id) === String(creator.id))) {
      members.unshift({
        _id: creator.id,
        nickName: creator.nickName,
        avatarUrl: creator.avatarUrl || '',
      });
    }

    // 检查用户是否是该拼车的成员
    const isMember = String(carpool.creator_id) === String(req.userId) ||
      participants.some(p => String(p.user_id) === String(req.userId));
    if (!isMember) throw new AppError('你不是该拼车的成员', 403);

    res.json({
      success: true,
      data: {
        carpoolId: carpool.id,
        from: carpool.from_place,
        to: carpool.to_place,
        departureTime: carpool.departureTime,
        status: carpool.status,
        memberCount: members.length,
        members,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取群聊消息
 * GET /api/messages/group/:carpoolId
 */
exports.getGroupMessages = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 50 } = req.query;
    const carpoolId = req.params.carpoolId;
    const pool = require('../config/db')();

    // 检查拼车是否存在
    const [carpoolRows] = await pool.query('SELECT * FROM carpools WHERE id = ?', [carpoolId]);
    if (carpoolRows.length === 0) throw new AppError('拼车不存在', 404);
    const carpool = carpoolRows[0];

    // 查参与者
    const [participants] = await pool.query(
      'SELECT user_id FROM carpool_participants WHERE carpool_id = ? AND status = ?',
      [carpoolId, 'joined']
    );
    const isMember = String(carpool.creator_id) === String(req.userId) ||
      participants.some(p => String(p.user_id) === String(req.userId));
    if (!isMember) throw new AppError('你不是该拼车的成员', 403);

    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    const [messages] = await pool.query(
      `SELECT m.*, u.nickName as sender_nickName, u.avatarUrl as sender_avatarUrl
       FROM messages m
       INNER JOIN users u ON m.sender_id = u.id
       WHERE m.relatedCarpool_id = ?
       ORDER BY m.createTime DESC
       LIMIT ? OFFSET ?`,
      [carpoolId, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) as total FROM messages WHERE relatedCarpool_id = ?',
      [carpoolId]
    );

    const list = messages.reverse().map(m => ({
      id: m.id,
      conversationId: m.conversation_id,
      sender: {
        _id: m.sender_id,
        id: m.sender_id,
        nickName: m.sender_nickName,
        avatarUrl: m.sender_avatarUrl || '',
        toString: function() { return String(this._id); }
      },
      type: m.type,
      content: m.content,
      imageUrl: m.imageUrl,
      createTime: m.createTime,
    }));

    res.json({
      success: true,
      data: {
        list,
        total,
        page: parseInt(page),
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 发送群聊消息
 * POST /api/messages/group/:carpoolId
 */
exports.sendGroupMessage = async (req, res, next) => {
  try {
    const carpoolId = req.params.carpoolId;
    const { content, type = 'text', imageUrl } = req.body;

    if (!content || !content.trim()) {
      throw new AppError('消息内容不能为空', 400);
    }

    // 检查拼车是否存在 + 用户是否成员
    const pool = require('../config/db')();
    const [carpoolRows] = await pool.query('SELECT * FROM carpools WHERE id = ?', [carpoolId]);
    if (carpoolRows.length === 0) throw new AppError('拼车不存在', 404);
    const carpool = carpoolRows[0];

    const [participants] = await pool.query(
      'SELECT user_id FROM carpool_participants WHERE carpool_id = ? AND status = ?',
      [carpoolId, 'joined']
    );
    const isMember = String(carpool.creator_id) === String(req.userId) ||
      participants.some(p => String(p.user_id) === String(req.userId));
    if (!isMember) throw new AppError('你不是该拼车的成员', 403);

    const message = await Message.create({
      conversationId: `carpool_${carpoolId}`,
      sender: req.userId,
      carpoolId,
      type,
      content: content.trim(),
      imageUrl: imageUrl || '',
    });

    // 手动填充 sender 信息（create 返回的对象没有 populate 方法）
    if (message) {
      const { User } = require('../models');
      const sender = await User.findById(req.userId);
      if (sender) {
        message.sender = {
          _id: sender._id,
          id: sender.id,
          nickName: sender.nickName,
          avatarUrl: sender.avatarUrl || '',
          toString: function() { return String(this._id); }
        };
      }
    }

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    next(error);
  }
};
