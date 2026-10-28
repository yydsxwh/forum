// ==================== 同行鸭后端 REST API ====================
// 后端地址：https://{{DOMAIN}}
// 使用 JWT Token 认证

const API_BASE = 'https://{{DOMAIN}}';

// 将后端返回的相对路径（如 /uploads/xxx.png）补全为完整 URL
// 已是完整 URL（http/https 开头）或空值则原样返回
function fixUrl(p) {
  if (!p || typeof p !== 'string') return p;
  if (p.startsWith('http://') || p.startsWith('https://')) return p;
  if (p.startsWith('/uploads/') || p.startsWith('/public/')) return API_BASE + p;
  return p;
}

// 批量修正一个对象里的图片字段（avatarUrl / images / imageUrl / voiceUrl）
function fixImageUrls(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(fixImageUrls);
  const out = { ...obj };
  if (out.avatarUrl) out.avatarUrl = fixUrl(out.avatarUrl);
  if (out.imageUrl) out.imageUrl = fixUrl(out.imageUrl);
  if (out.voiceUrl) out.voiceUrl = fixUrl(out.voiceUrl);
  if (Array.isArray(out.images)) out.images = out.images.map(fixUrl);
  if (out.otherUserAvatar) out.otherUserAvatar = fixUrl(out.otherUserAvatar);
  if (out.otherUser && out.otherUser.avatarUrl) {
    out.otherUser = { ...out.otherUser, avatarUrl: fixUrl(out.otherUser.avatarUrl) };
  }
  if (out.creator && out.creator.avatarUrl) {
    out.creator = { ...out.creator, avatarUrl: fixUrl(out.creator.avatarUrl) };
  }
  if (out.sender && out.sender.avatarUrl) {
    out.sender = { ...out.sender, avatarUrl: fixUrl(out.sender.avatarUrl) };
  }
  if (Array.isArray(out.participants)) {
    out.participants = out.participants.map(p => {
      if (!p) return p;
      const np = { ...p };
      if (np.avatarUrl) np.avatarUrl = fixUrl(np.avatarUrl);
      if (np.user && np.user.avatarUrl) np.user = { ...np.user, avatarUrl: fixUrl(np.user.avatarUrl) };
      return np;
    });
  }
  if (Array.isArray(out.members)) {
    out.members = out.members.map(m => {
      if (!m) return m;
      const nm = { ...m };
      if (nm.avatarUrl) nm.avatarUrl = fixUrl(nm.avatarUrl);
      return nm;
    });
  }
  // 档口评价列表
  if (Array.isArray(out.reviews)) {
    out.reviews = out.reviews.map(r => {
      if (!r) return r;
      const nr = { ...r };
      if (nr.avatarUrl) nr.avatarUrl = fixUrl(nr.avatarUrl);
      if (Array.isArray(nr.images)) nr.images = nr.images.map(fixUrl);
      if (!nr.nickName) nr.nickName = '匿名用户';
      return nr;
    });
  }
  return out;
}

function getToken() {
  try {
    return getApp().globalData.token || wx.getStorageSync('token') || '';
  } catch (e) {
    return wx.getStorageSync('token') || '';
  }
}

function setToken(token) {
  wx.setStorageSync('token', token);
  wx.removeStorageSync('_tokenDeadAt'); // 清除过期标记
  try { getApp().globalData.token = token; } catch (e) {}
}

function clearToken() {
  wx.removeStorageSync('token');
  wx.removeStorageSync('refreshToken');
  wx.removeStorageSync('_tokenDeadAt');
  wx.removeStorageSync('userInfo');
  try {
    const app = getApp();
    app.globalData.token = '';
    app.globalData.userInfo = null;
    app.globalData.isLogin = false;
  } catch (e) {}
}

// Token刷新锁
let _refreshing = false;
let _refreshQueue = [];
let _silentReLoginFailedAt = 0;

/**
 * 静默重新登录：token 和 refreshToken 都失效时，自动调 wx.login 获取新 token
 * 无需用户操作，后台静默完成。5 分钟内失败过一次就不再重试。
 */
async function silentReLogin() {
  if (_silentReLoginFailedAt && Date.now() - _silentReLoginFailedAt < 300000) return false;
  try {
    const loginRes = await new Promise((resolve) => {
      wx.login({ success: r => resolve(r), fail: () => resolve(null) });
    });
    if (!loginRes || !loginRes.code) return false;
    const res = await wxLogin(loginRes.code);
    if (res && res.success && res.data && res.data.token) {
      _silentReLoginFailedAt = 0;
      return true;
    }
  } catch (e) {}
  _silentReLoginFailedAt = Date.now();
  return false;
}

async function _doRefresh() {
  if (_refreshing) return _refreshing;
  _refreshing = true;
  const rt = wx.getStorageSync('refreshToken');
  if (!rt) { _refreshing = false; return false; }
  try {
    const res = await new Promise((resolve) => {
      wx.request({
        url: `${API_BASE}/api/auth/refresh-token`,
        method: 'POST',
        header: { 'Content-Type': 'application/json' },
        data: { refreshToken: rt },
        success: r => resolve(r),
        fail: () => resolve(null),
      });
    });
    if (res && res.statusCode === 200 && res.data && res.data.data && res.data.data.token) {
      setToken(res.data.data.token);
      if (res.data.data.refreshToken) wx.setStorageSync('refreshToken', res.data.data.refreshToken);
      _refreshing = false;
      return true;
    }
  } catch (e) {}
  _refreshing = false;
  clearToken();
  wx.removeStorageSync('refreshToken');
  return false;
}

// 通用请求（自动处理 JWT 和 401 自动刷新）
function request(method, path, data, needAuth) {
  return new Promise((resolve) => {
    const doRequest = (token) => {
      const header = { 'Content-Type': 'application/json' };
      if (needAuth !== false && token) header['Authorization'] = `Bearer ${token}`;
      const reqOpts = { url: `${API_BASE}${path}`, method, header };
      // ⚠️ 关键修复：GET/DELETE 请求不要传 data，否则真实微信环境会把 null 序列化为 "null" 字符串
      //    作为 body 发送，导致服务端 express.json() 解析失败（entity.parse.failed）
      //    模拟器不会复现，因为 DevTools 的 wx.request 对 data:null 做了容错处理
      if (data != null && method !== 'GET' && method !== 'DELETE') {
        reqOpts.data = data;
      }
      wx.request({
        ...reqOpts,
        success: async (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
          } else if (res.statusCode === 401 && needAuth !== false) {
            // 尝试刷新token后重试一次
            const refreshed = await _doRefresh();
            if (refreshed) {
              doRequest(getToken());
            } else {
              // refreshToken 也失效，尝试静默重新登录
              const reLogged = await silentReLogin();
              if (reLogged) {
                doRequest(getToken());
              } else {
                clearToken();
                resolve({ success: false, message: '登录已过期，请重新登录', _401: true });
              }
            }
          } else {
            resolve(res.data || { success: false, message: '请求失败' });
          }
        },
        fail: (err) => {
          const fullUrl = `${API_BASE}${path}`;
          console.error(`[API] ${method} ${fullUrl} 失败:`, JSON.stringify(err));
          // 检查域名是否有空格、特殊字符
          if (fullUrl !== fullUrl.trim()) console.warn('[API] URL 包含前后空格，可能引起请求失败');
          resolve({ success: false, message: '网络请求失败', _errMsg: err.errMsg || '' });
        }
      });
    };
    // 无 token 时不发需认证的请求，避免 401 循环
    if (needAuth !== false && !getToken() && !wx.getStorageSync('refreshToken')) {
      return resolve({ success: false, message: '请先登录', _401: true });
    }
    doRequest(needAuth !== false ? getToken() : '');
  });
}

// ============ 认证 ============

async function wxLogin(code, userData = {}) {
  // 自动采集设备信息（手机型号 + 微信版本），登录时随请求一起上报
  // 后端 wechat-login 接口会把这些字段写入 users 表的 platform/device_brand/device_model/device_version
  const deviceInfo = (() => {
    try {
      // 用新 API 替代废弃的旧接口
      const di = (typeof wx.getDeviceInfo === 'function') ? wx.getDeviceInfo() : {};
      const ab = (typeof wx.getAppBaseInfo === 'function') ? wx.getAppBaseInfo() : {};
      return {
        platform: di.platform || ab.platform || 'wechat',  // ios / android / devtools
        brand:    di.brand    || '',                        // Apple / Xiaomi / HUAWEI ...
        model:    di.model    || '',                        // iPhone 15 / Mi 14 ...
        version:  ab.version  || '',                        // 微信版本号，如 8.0.50
      };
    } catch (e) {
      return { platform: 'wechat', brand: '', model: '', version: '' };
    }
  })();

  const res = await request('POST', '/api/auth/wechat-login', {
    code,
    nickName: userData.nickName || '',
    avatarUrl: userData.avatarUrl || '',
    gender: userData.gender || 'secret',
    ...deviceInfo,
  }, false);
  if (res.success && res.data && res.data.token) {
    setToken(res.data.token);
    if (res.data.refreshToken) wx.setStorageSync('refreshToken', res.data.refreshToken);
  }
  return res;
}

async function refreshToken() {
  const rt = wx.getStorageSync('refreshToken');
  if (!rt) return { success: false };
  const res = await request('POST', '/api/auth/refresh-token', { refreshToken: rt }, false);
  if (res.success && res.data && res.data.token) {
    setToken(res.data.token);
    if (res.data.refreshToken) wx.setStorageSync('refreshToken', res.data.refreshToken);
  }
  return res;
}

async function logout() {
  await request('POST', '/api/auth/logout');
  clearToken();
  wx.removeStorageSync('refreshToken');
}

// ============ 用户 ============

async function getUserProfile(userId) {
  if (userId) {
    const res = await request('GET', `/api/user/profile/${userId}`);
    if (res.success && res.data) return { ...res, data: fixImageUrls(res.data) };
    return res;
  }
  const res = await request('GET', '/api/user/profile');
  if (res.success && res.data) return { ...res, data: fixImageUrls(res.data) };
  return res;
}

async function upsertUser(userData) {
  return await request('PUT', '/api/user/profile', userData);
}

async function searchUsers(keyword) {
  const res = await request('GET', `/api/user/search?keyword=${encodeURIComponent(keyword)}`);
  if (res.success && res.data) return { ...res.data, success: true };
  return res;
}

async function getUserStatistics() {
  const res = await request('GET', '/api/user/statistics');
  if (res.success && res.data) return { ...res.data, success: true };
  return res;
}

async function getCreditRecords(params = {}) {
  const qs = `?page=${params.page || 1}&pageSize=${params.pageSize || 20}`;
  const res = await request('GET', `/api/user/credit-records${qs}`);
  if (res.success && res.data) {
    return { ...res.data, success: true };
  }
  return res;
}

async function bindPhone(phone, code) {
  return await request('PUT', '/api/user/bind-phone', { phone, code });
}

async function sendCode(phone) {
  return await request('POST', '/api/auth/send-code', { phone });
}

async function bindWechat(wechatData) {
  return await request('PUT', '/api/user/bind-wechat', wechatData);
}

// ============ 拼车 ============

async function getCarpoolList(params = {}) {
  const q = [];
  const ft = params.filterType || params.type || '';
  if (ft && ft !== 'all') {
    q.push(`keyword=${encodeURIComponent(ft)}`);
  }
  if (params.from) q.push(`from=${encodeURIComponent(params.from)}`);
  if (params.to) q.push(`to=${encodeURIComponent(params.to)}`);
  if (params.keyword) q.push(`keyword=${encodeURIComponent(params.keyword)}`);
  q.push(`page=${params.page || 1}`);
  q.push(`pageSize=${params.pageSize || 10}`);
  const res = await request('GET', `/api/carpools?${q.join('&')}`, null, true);
  if (res.success && res.data) {
    const list = (res.data.list || []).map(fixImageUrls);
    return { ...res.data, list, success: true };
  }
  return res;
}

async function getCarpoolDetail(id) {
  const res = await request('GET', `/api/carpools/${id}`, null, true);
  if (res.success && res.data) return { ...res, data: fixImageUrls(res.data) };
  return res;
}

async function createCarpool(data) {
  return await request('POST', '/api/carpools', data);
}

async function updateCarpool(id, data) {
  return await request('PUT', `/api/carpools/${id}`, data);
}

async function deleteCarpool(id, reason) {
  return await request('DELETE', `/api/carpools/${id}`, { reason });
}

async function joinCarpool(carpoolId) {
  return await request('POST', `/api/carpools/${carpoolId}/join`);
}

async function cancelJoinCarpool(carpoolId) {
  return await request('POST', `/api/carpools/${carpoolId}/cancel`);
}

async function endCarpool(carpoolId) {
  return await request('POST', `/api/carpools/${carpoolId}/end`);
}

async function favoriteCarpool(carpoolId) {
  return await request('POST', `/api/carpools/${carpoolId}/favorite`);
}

async function unfavoriteCarpool(carpoolId) {
  return await request('DELETE', `/api/carpools/${carpoolId}/favorite`);
}

async function getMyCarpools(params = {}) {
  const qs = `?page=${params.page || 1}&pageSize=${params.pageSize || 10}`;
  const res = await request('GET', `/api/carpools/my/published${qs}`);
  if (res.success && res.data) {
    const list = (res.data.list || []).map(fixImageUrls);
    return { ...res.data, list, success: true };
  }
  return res;
}

async function getMyJoined(params = {}) {
  const qs = `?page=${params.page || 1}&pageSize=${params.pageSize || 10}`;
  const res = await request('GET', `/api/carpools/my/joined${qs}`);
  if (res.success && res.data) {
    const list = (res.data.list || []).map(fixImageUrls);
    return { ...res.data, list, success: true };
  }
  return res;
}

async function getMyFavorites(params = {}) {
  const qs = `?page=${params.page || 1}&pageSize=${params.pageSize || 10}`;
  const res = await request('GET', `/api/carpools/my/favorites${qs}`);
  if (res.success && res.data) {
    const list = (res.data.list || []).map(fixImageUrls);
    return { ...res.data, list, success: true };
  }
  return res;
}

// ============ 通知 ============

async function getNotifications(params = {}) {
  const qs = `?page=${params.page || 1}&pageSize=${params.pageSize || 20}`;
  const res = await request('GET', `/api/notifications${qs}`);
  if (res.success && res.data) {
    return {
      list: res.data.list || [],
      total: res.data.total || 0,
      unread: res.data.unreadCount || 0,
      success: true,
    };
  }
  return res;
}

async function getUnreadCount() {
  const res = await request('GET', '/api/notifications/unread-count');
  if (res.success && res.data) return { ...res.data, success: true };
  return res;
}

async function markAllNotificationsRead() {
  return await request('PUT', '/api/notifications/read-all');
}

async function markNotificationRead(id) {
  return await request('PUT', `/api/notifications/${id}/read`);
}

async function deleteNotification(id) {
  return await request('DELETE', `/api/notifications/${id}`);
}

// ============ 消息/私信 ============

async function getConversations() {
  const res = await request('GET', '/api/messages/enhanced/conversations');
  if (res.success && res.data) {
    const rawList = Array.isArray(res.data) ? res.data : (res.data.list || []);
    const list = rawList.map(c => {
      const fixed = fixImageUrls(c);
      if (fixed.otherUser && fixed.otherUser.avatarUrl) {
        fixed.otherUserAvatar = fixed.otherUser.avatarUrl;
      }
      // 统一字段名：后端返回 unreadCount，前端统一用 unread
      if (fixed.unreadCount !== undefined) fixed.unread = fixed.unreadCount;
      return fixed;
    });
    return { list, success: true };
  }
  const res2 = await request('GET', '/api/messages/conversations');
  if (res2.success && res2.data) {
    const rawList = Array.isArray(res2.data) ? res2.data : (res2.data.list || []);
    const list = rawList.map(c => {
      const fixed = fixImageUrls(c);
      if (fixed.otherUser && fixed.otherUser.avatarUrl) {
        fixed.otherUserAvatar = fixed.otherUser.avatarUrl;
      }
      if (fixed.unreadCount !== undefined) fixed.unread = fixed.unreadCount;
      return fixed;
    });
    return { list, success: true };
  }
  return { list: [], success: false };
}

async function hideConversation(conversationId) {
  return await request('POST', '/api/messages/enhanced/hide', { conversationId });
}

async function hideMessage(messageId) {
  return await request('POST', `/api/messages/enhanced/delete/${messageId}`);
}

async function getMessages(conversationId, page = 1, pageSize = 50) {
  const res = await request('GET', `/api/messages/${conversationId}?page=${page}&pageSize=${pageSize}`);
  if (res.success && res.data) {
    const list = (res.data.list || []).map(m => {
      const fixed = fixImageUrls(m);
      if (m.sender && m.sender.avatarUrl) {
        fixed.sender = { ...m.sender, avatarUrl: fixUrl(m.sender.avatarUrl) };
      }
      return fixed;
    });
    return { ...res.data, list, success: true };
  }
  return res;
}

async function sendMessage(receiverId, content, extra = {}) {
  // 优先使用增强版（含陌生人限制）
  const res = await request('POST', '/api/messages/enhanced/send', { receiverId, content, ...extra });
  if (res.success) return res;
  // 降级到基础版
  return await request('POST', '/api/messages', { receiverId, content, ...extra });
}

async function markMessageRead(id) {
  return await request('PUT', `/api/messages/${id}/read`);
}

async function recallMessage(id) {
  return await request('PUT', `/api/messages/${id}/recall`);
}

async function getUnreadMessageCount() {
  const res = await request('GET', '/api/messages/unread-count');
  if (res.success && res.data) return { ...res.data, success: true };
  return res;
}

// 增强版消息
async function getOnlineUsers() {
  const res = await request('GET', '/api/messages/enhanced/online');
  if (res.success && res.data) return { ...res.data, success: true };
  return res;
}

async function getStrangerStatus(userId) {
  const res = await request('GET', `/api/messages/enhanced/stranger-status/${userId}`);
  if (res.success && res.data) return { ...res.data, success: true };
  return res;
}

// 标记会话已读（与 H5 markConversationRead 对齐）
async function markConversationRead(conversationId) {
  return await request('PUT', `/api/messages/conversation/${encodeURIComponent(conversationId)}/read`);
}

// ============ 群聊 ============

// 我的群聊列表
async function getMyGroupChats() {
  const res = await request('GET', '/api/messages/groups');
  if (res.success && res.data) return { list: Array.isArray(res.data) ? res.data : (res.data.list || []), success: true };
  return res;
}

// 群聊信息
async function getGroupInfo(carpoolId) {
  const res = await request('GET', `/api/messages/group/${carpoolId}/info`);
  if (res.success && res.data) return { data: fixImageUrls(res.data), success: true };
  return res;
}

// 群聊消息（分页）
async function getGroupMessages(carpoolId, page = 1, pageSize = 50) {
  const res = await request('GET', `/api/messages/group/${carpoolId}?page=${page}&pageSize=${pageSize}`);
  if (res.success && res.data) {
    const list = Array.isArray(res.data) ? res.data : (res.data.list || []);
    return { list: list.map(fixImageUrls), total: res.data.total, success: true };
  }
  return res;
}

// 发送群聊消息
async function sendGroupMessage(carpoolId, content) {
  return await request('POST', `/api/messages/group/${carpoolId}`, { content });
}

async function markGroupRead(carpoolId) {
  return await request('POST', `/api/messages/group/${carpoolId}/read`);
}

// ============ 评价 ============

async function getUserReviews(userId) {
  const res = await request('GET', `/api/review/user/${userId}`, null, false);
  if (res.success && res.data) return { ...res.data, success: true };
  return res;
}

async function getMyReviews(params = {}) {
  const qs = `?page=${params.page || 1}&pageSize=${params.pageSize || 10}`;
  const res = await request('GET', `/api/review/my${qs}`);
  if (res.success && res.data) return { ...res.data, success: true };
  return res;
}

async function createReview(data) {
  return await request('POST', '/api/review', data);
}

async function deleteReview(id) {
  return await request('DELETE', `/api/review/${id}`);
}

// ============ 投诉 ============

async function createComplaint(data) {
  return await request('POST', '/api/complaints', data);
}

async function getMyComplaints(params = {}) {
  const qs = `?page=${params.page || 1}&pageSize=${params.pageSize || 10}`;
  const res = await request('GET', `/api/complaints/my${qs}`);
  if (res.success && res.data) return { ...res.data, success: true };
  return res;
}

async function getComplaintDetail(id) {
  const res = await request('GET', `/api/complaints/${id}`);
  if (res.success && res.data) return { ...res.data, success: true };
  return res;
}

async function submitAppeal(id, content) {
  return await request('POST', `/api/complaints/${id}/appeal`, { content });
}

// ============ 反馈 ============

async function createFeedback(data) {
  return await request('POST', '/api/feedback', data);
}

async function getMyFeedback(params = {}) {
  const qs = `?page=${params.page || 1}&pageSize=${params.pageSize || 10}`;
  const res = await request('GET', `/api/feedback/my${qs}`);
  if (res.success && res.data) return { ...res.data, success: true };
  return res;
}

async function getFeedbackDetail(id) {
  const res = await request('GET', `/api/feedback/${id}`);
  if (res.success && res.data) return { ...res.data, success: true };
  return res;
}

async function rateFeedback(id, rating) {
  return await request('PUT', `/api/feedback/${id}/rate`, { rating });
}

async function closeFeedback(id) {
  return await request('PUT', `/api/feedback/${id}/close`);
}

// ============ 联系作者 ============

async function createContactMessage(data) {
  return await request('POST', '/api/contact', data);
}

async function getMyContactMessages(params = {}) {
  const qs = `?page=${params.page || 1}&pageSize=${params.pageSize || 10}`;
  const res = await request('GET', `/api/contact/my${qs}`);
  if (res.success && res.data) return { ...res.data, success: true };
  return res;
}

// ============ 推荐 ============

async function getHotRoutes() {
  const res = await request('GET', '/api/recommend/hot-routes', null, false);
  if (res.success && res.data) return { ...res.data, success: true };
  return res;
}

async function getRecommendEstimate(params = {}) {
  const qs = Object.entries(params).map(([k,v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const res = await request('GET', `/api/recommend/estimate?${qs}`, null, false);
  if (res.success && res.data) return { ...res.data, success: true };
  return res;
}

async function getRecommendLocations() {
  const res = await request('GET', '/api/recommend/locations', null, false);
  if (res.success && res.data) return { ...res.data, success: true };
  return res;
}

async function getNearbyUsers(params = {}) {
  const qs = Object.entries(params).map(([k,v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const res = await request('GET', `/api/recommend/nearby?${qs}`);
  if (res.success && res.data) return { ...res.data, success: true };
  return res;
}

async function getRecommendForMe() {
  const res = await request('GET', '/api/recommend/for-me');
  if (res.success && res.data) return { ...res.data, success: true };
  return res;
}

// ============ 拼车标签池 ============

async function getCarpoolTags() {
  const res = await request('GET', '/api/carpool-tags', null, false);
  if (res.success && res.data) return { ...res.data, success: true };
  return res;
}

// ============ 食堂推荐 ============

async function getFoodRecommendations(params = {}) {
  const q = [];
  if (params.page) q.push(`page=${params.page}`);
  if (params.pageSize) q.push(`pageSize=${params.pageSize}`);
  if (params.canteen) q.push(`canteen_id=${encodeURIComponent(params.canteen)}`);
  if (params.category) q.push(`category=${encodeURIComponent(params.category)}`);
  if (params.sort) q.push(`sort=${encodeURIComponent(params.sort)}`);
  if (params.keyword) q.push(`keyword=${encodeURIComponent(params.keyword)}`);
  const qs = q.length > 0 ? `?${q.join('&')}` : '';
  const res = await request('GET', `/api/canteen/stalls${qs}`, null, false);
  if (res.success && res.data) {
    const list = (res.data.list || res.data || []).map(fixImageUrls);
    return { list, total: res.data.total || list.length, success: true };
  }
  return res;
}

async function createFoodPost(data) {
  return await request('POST', '/api/food', data, true);
}

async function recommendFood(id) {
  return await request('POST', `/api/food/${id}/recommend`, {}, true);
}

async function getFoodDetail(id) {
  const res = await request('GET', `/api/food/${id}`, null, false);
  if (res.success && res.data) return { ...res, data: fixImageUrls(res.data) };
  return res;
}

// ============ 食堂管理（档口+评价） ============

async function getCanteens() {
  const res = await request('GET', '/api/canteen/canteens', null, false);
  if (res.success && res.data) return { list: res.data, success: true };
  return res;
}

async function getStalls(params = {}) {
  const q = [];
  if (params.canteen_id) q.push(`canteen_id=${params.canteen_id}`);
  if (params.category) q.push(`category=${encodeURIComponent(params.category)}`);
  if (params.keyword) q.push(`keyword=${encodeURIComponent(params.keyword)}`);
  if (params.page) q.push(`page=${params.page}`);
  if (params.pageSize) q.push(`pageSize=${params.pageSize}`);
  const qs = q.length > 0 ? `?${q.join('&')}` : '';
  const res = await request('GET', `/api/canteen/stalls${qs}`, null, false);
  if (res.success && res.data) {
    const list = (res.data.list || []).map(fixImageUrls);
    return { list, total: res.data.total || list.length, success: true };
  }
  return res;
}

async function getStallDetail(id) {
  const res = await request('GET', `/api/canteen/stalls/${id}`, null, false);
  if (res.success && res.data) return { ...res, data: fixImageUrls(res.data) };
  return res;
}

async function getStallMenu(stallId) {
  return await request('GET', `/api/canteen/stalls/${stallId}/menu`, null, false);
}

async function submitStallReview(stallId, rating, content, images) {
  return await request('POST', `/api/canteen/stalls/${stallId}/review`, { rating, content, images }, true);
}

async function getMyStallReview(stallId) {
  return await request('GET', `/api/canteen/stalls/${stallId}/my-review`, null, true);
}

// ============ 公告 ============

async function getAnnouncements(params = {}) {
  const qs = `?page=${params.page || 1}&pageSize=${params.pageSize || 10}`;
  const res = await request('GET', `/api/announcements${qs}`, null, false);
  if (res.success && res.data) return { ...res.data, success: true };
  return res;
}

async function getAnnouncementDetail(id) {
  const res = await request('GET', `/api/announcements/${id}`, null, false);
  if (res.success && res.data) return { ...res.data, success: true };
  return res;
}

async function likeAnnouncement(id) {
  return await request('POST', `/api/announcements/${id}/like`);
}

async function getAnnouncementComments(id) {
  const res = await request('GET', `/api/announcements/${id}/comments`, null, false);
  if (res.success && res.data) return { ...res.data, success: true };
  return res;
}

async function addAnnouncementComment(id, content) {
  return await request('POST', `/api/announcements/${id}/comments`, { content });
}

async function deleteAnnouncementComment(id, commentId) {
  return await request('DELETE', `/api/announcements/${id}/comments/${commentId}`);
}

// ============ 模块通用 API ============

async function getModuleList(module, params = {}) {
  const q = [];
  if (params.page) q.push(`page=${params.page}`);
  if (params.pageSize) q.push(`pageSize=${params.pageSize}`);
  if (params.keyword) q.push(`keyword=${encodeURIComponent(params.keyword)}`);
  if (params.status) q.push(`status=${params.status}`);
  if (params.type && params.type !== 'all') q.push(`type=${encodeURIComponent(params.type)}`);
  if (params.category) q.push(`category=${encodeURIComponent(params.category)}`);
  if (params.minPrice != null) q.push(`minPrice=${params.minPrice}`);
  if (params.maxPrice != null) q.push(`maxPrice=${params.maxPrice}`);
  if (params.order) q.push(`order=${params.order}`);
  const qs = q.length > 0 ? `?${q.join('&')}` : '';
  const res = await request('GET', `/api/module/${module}${qs}`, null, true);
  if (res.success && res.data) {
    const list = (res.data.list || []).map(fixImageUrls);
    return { ...res.data, list, success: true };
  }
  return res;
}

async function getModuleDetail(module, id) {
  const res = await request('GET', `/api/module/${module}/${id}`, null, true);
  if (res.success && res.data) return { ...res, data: fixImageUrls(res.data) };
  return res;
}

async function createModulePost(module, data) {
  return await request('POST', `/api/module/${module}`, data, true);
}

async function updateModulePost(module, id, data) {
  return await request('PUT', `/api/module/${module}/${id}`, data, true);
}

async function deleteModulePost(module, id) {
  return await request('DELETE', `/api/module/${module}/${id}`, {}, true);
}

async function toggleModuleFavorite(module, id) {
  return await request('POST', `/api/module/${module}/${id}/favorite`, {}, true);
}

async function closeModulePost(module, id) {
  return await request('POST', `/api/module/${module}/${id}/close`, {}, true);
}

async function takeModulePost(module, id) {
  return await request('POST', `/api/module/${module}/${id}/take`, {}, true);
}

async function getModuleReplies(module, id, params = {}) {
  const qs = `?page=${params.page || 1}&pageSize=${params.pageSize || 20}`;
  return await request('GET', `/api/module/${module}/${id}/replies${qs}`, null, true);
}

async function createModuleReply(module, id, data) {
  return await request('POST', `/api/module/${module}/${id}/reply`, data, true);
}

async function deleteModuleReply(module, id, replyId) {
  return await request('DELETE', `/api/module/${module}/${id}/reply/${replyId}`, null, true);
}

async function getMyModulePosts(module, params = {}) {
  const parts = [`page=${params.page || 1}`, `pageSize=${params.pageSize || 20}`];
  if (params.excludeStatus) parts.push(`excludeStatus=${params.excludeStatus}`);
  const qs = '?' + parts.join('&');
  const res = await request('GET', `/api/module/${module}/my${qs}`, null, true);
  if (res.success && res.data) {
    const list = (res.data.list || []).map(fixImageUrls);
    return { ...res.data, list, success: true };
  }
  return res;
}

async function getMyTakenPosts(module, params = {}) {
  const parts = [`page=${params.page || 1}`, `pageSize=${params.pageSize || 20}`];
  if (params.excludeStatus) parts.push(`excludeStatus=${params.excludeStatus}`);
  const qs = '?' + parts.join('&');
  const res = await request('GET', `/api/module/${module}/taken${qs}`, null, true);
  if (res.success && res.data) {
    const list = (res.data.list || []).map(fixImageUrls);
    return { ...res.data, list, success: true };
  }
  return res;
}

async function completeModulePost(module, id) {
  return await request('POST', `/api/module/${module}/${id}/complete`, {}, true);
}

async function getMyModuleFavorites(module, params = {}) {
  const qs = `?page=${params.page || 1}&pageSize=${params.pageSize || 20}`;
  const res = await request('GET', `/api/module/${module}/favorites${qs}`, null, true);
  if (res.success && res.data) {
    const list = (res.data.list || []).map(fixImageUrls);
    return { ...res.data, list, success: true };
  }
  return res;
}

async function getModuleStats() {
  return await request('GET', '/api/module/stats', null, false);
}

// ============ 跨模块聚合 ============

// 所有模块列表及中文名称
const ALL_MODULES = ['express', 'task', 'lost', 'secondhand', 'rental', 'substitute', 'print', 'yellowpage', 'bulletin', 'charity'];

const MODULE_LABELS = {
  express: '快递待取', task: '大厅任务', lost: '失物招领',
  secondhand: '二手市集', rental: '物品短租', substitute: '交换人生',
  print: '打印跑腿', yellowpage: '校园黄页', bulletin: '公告板', charity: '爱心公益'
};

function getModuleLabel(m) { return MODULE_LABELS[m] || m; }

// 聚合「我的发布」：拼车 + 所有模块
async function getMyAllPosts(params = {}) {
  const page = params.page || 1;
  const pageSize = params.pageSize || 10;
  const reqParams = { page, pageSize };
  const [carpoolRes, ...moduleResList] = await Promise.all([
    getMyCarpools(reqParams).catch(() => null),
    ...ALL_MODULES.map(m => getMyModulePosts(m, reqParams).catch(() => null))
  ]);

  let all = [];

  if (carpoolRes && carpoolRes.list) {
    carpoolRes.list.forEach(item => {
      all.push({ ...item, _moduleType: 'carpool', _moduleName: '拼车', _sortTime: item.createTime || '' });
    });
  }

  ALL_MODULES.forEach((module, i) => {
    const res = moduleResList[i];
    if (res && res.list) {
      res.list.forEach(item => {
        all.push({
          ...item,
          _moduleType: 'module',
          _moduleName: getModuleLabel(module),
          _module: module,
          _sortTime: item.createTime || ''
        });
      });
    }
  });

  all.sort((a, b) => (new Date(b._sortTime || 0) - new Date(a._sortTime || 0)));
  const total = all.length;
  const list = all.slice(0, pageSize);
  return { list, total, success: true, hasMore: all.length > pageSize };
}

// 聚合「我的收藏」：拼车 + 所有模块
async function getMyAllFavorites(params = {}) {
  const page = params.page || 1;
  const pageSize = params.pageSize || 10;
  const reqParams = { page, pageSize };
  const [carpoolRes, ...moduleResList] = await Promise.all([
    getMyFavorites(reqParams).catch(() => null),
    ...ALL_MODULES.map(m => getMyModuleFavorites(m, reqParams).catch(() => null))
  ]);

  let all = [];

  if (carpoolRes && carpoolRes.list) {
    carpoolRes.list.forEach(item => {
      all.push({ ...item, _moduleType: 'carpool', _moduleName: '拼车', _sortTime: item.createTime || '' });
    });
  }

  ALL_MODULES.forEach((module, i) => {
    const res = moduleResList[i];
    if (res && res.list) {
      res.list.forEach(item => {
        all.push({
          ...item,
          _moduleType: 'module',
          _moduleName: getModuleLabel(module),
          _module: module,
          _sortTime: item.createTime || ''
        });
      });
    }
  });

  all.sort((a, b) => (new Date(b._sortTime || 0) - new Date(a._sortTime || 0)));
  const total = all.length;
  const list = all.slice(0, pageSize);
  return { list, total, success: true, hasMore: all.length > pageSize };
}

// 聚合「大厅任务」：从多个任务型模块拉最新发布，按时间合并，按模块打标签
async function getHallTasks(params = {}) {
  const limit = params.limit || 50;
  const moduleFilter = params.modules; // 可选：要拉取的模块白名单
  const hasCarpool = !moduleFilter || moduleFilter.length === 0 || moduleFilter.includes('carpool');
  const modules = moduleFilter && moduleFilter.length
    ? ALL_MODULES.filter(m => moduleFilter.includes(m))
    : ALL_MODULES;
  const reqParams = { page: 1, pageSize: Math.max(limit, 10) };
  
  const results = await Promise.all([
    hasCarpool ? getCarpoolList(reqParams).catch(() => null) : null,
    ...modules.map(m => getModuleList(m, reqParams).catch(() => null))
  ]);
  
  let all = [];
  
  // 拼车
  const carpoolRes = results[0];
  if (carpoolRes && carpoolRes.list) {
    carpoolRes.list.forEach(item => {
      all.push({
        ...item,
        _moduleType: 'carpool',
        _moduleName: '拼车',
        _module: 'carpool',
        _sortTime: item.createTime || item.updateTime || '',
        from: item.from || '',
        to: item.to || '',
        remainSeats: item.remainSeats,
        totalSeats: item.totalSeats,
        type: item.type || 'offer',
        _seatsText: item.remainSeats != null && item.totalSeats != null ? `${item.remainSeats}/${item.totalSeats}人` : '',
      });
    });
  }
  
  // 其他模块
  modules.forEach((module, i) => {
    const res = results[i + 1];
    if (res && res.list) {
      res.list.forEach(item => {
        all.push({
          ...item,
          _moduleType: 'module',
          _moduleName: getModuleLabel(module),
          _module: module,
          _sortTime: item.createTime || item.updateTime || '',
        });
      });
    }
  });
  // 按时间倒序
  all.sort((a, b) => (new Date(b._sortTime || 0) - new Date(a._sortTime || 0)));
  return all.slice(0, limit);
}

// 「热门任务」首页卡片：取最新 4 条用于轮播展示
async function getHotTasks(limit = 4) {
  const tasks = await getHallTasks({ limit: Math.max(limit * 2, 8) });
  // 给一个简单的「热度」分：最近 24 小时加权，否则按时间远近
  const now = Date.now();
  const scored = tasks.map(t => {
    const ts = new Date(t._sortTime || 0).getTime();
    const ageHours = (now - ts) / 3600000;
    const score = Math.max(0, 100 - ageHours) + (t.images && t.images.length ? 5 : 0);
    return { ...t, _score: score };
  });
  scored.sort((a, b) => b._score - a._score);
  return scored.slice(0, limit);
}


// ============ 上传 ============

function uploadFile(path, filePath, name = 'file') {
  return new Promise((resolve) => {
    wx.uploadFile({
      url: `${API_BASE}${path}`,
      filePath, name,
      header: { 'Authorization': `Bearer ${getToken()}` },
      success: (res) => {
        try { resolve(JSON.parse(res.data)); }
        catch (e) { resolve({ success: false, message: '上传失败' }); }
      },
      fail: () => resolve({ success: false, message: '上传失败' })
    });
  });
}

async function uploadAvatar(filePath) {
  // 先压缩为 144×144 的方形头像
  try {
    filePath = await compressImage(filePath, 144, 0.85);
  } catch (e) { /* 压缩失败就用原图 */ }
  return uploadFile('/api/upload/avatar', filePath);
}
function uploadImage(filePath) { return uploadFile('/api/upload/image', filePath); }

async function uploadImages(filePaths) {
  const results = [];
  for (const fp of filePaths) {
    const r = await uploadFile('/api/upload/image', fp);
    if (r.success && r.data) results.push(r.data.url);
  }
  return { success: results.length > 0, data: { urls: results } };
}

// 手机号登录
async function phoneLogin(phone, code) {
  const res = await request('POST', '/api/auth/phone-login', { phone, code }, false);
  if (res.success && res.data && res.data.token) {
    setToken(res.data.token);
    if (res.data.refreshToken) wx.setStorageSync('refreshToken', res.data.refreshToken);
  }
  return res;
}

// 注册
async function register(phone, password, code) {
  return await request('POST', '/api/auth/register', { phone, password, code }, false);
}

// ============ 工具 ============

function formatTime(date) {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getMonth()+1}月${d.getDate()}日 ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// 时间区间：6月22日 08:00-10:00
function formatTimeRange(earliest, latest) {
  const e = earliest ? new Date(earliest) : null;
  const l = latest ? new Date(latest) : null;
  if (!e) return '';
  const dateStr = `${e.getMonth()+1}月${e.getDate()}日`;
  const timeFrom = `${String(e.getHours()).padStart(2,'0')}:${String(e.getMinutes()).padStart(2,'0')}`;
  const timeTo = l ? `${String(l.getHours()).padStart(2,'0')}:${String(l.getMinutes()).padStart(2,'0')}` : timeFrom;
  return timeTo !== timeFrom ? `${dateStr} ${timeFrom}-${timeTo}` : `${dateStr} ${timeFrom}`;
}

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
}

function timeAgo(date) {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  const d = Math.floor(h / 24);
  if (d === 1) return '昨天';
  if (d < 7) return `${d}天前`;
  const dt = new Date(date);
  return `${dt.getMonth()+1}/${dt.getDate()}`;
}

// ====== 树洞 ======

function showToast(title, icon = 'none') { wx.showToast({ title, icon, duration: 2000 }); }
function showLoading(title = '加载中...') { wx.showLoading({ title, mask: true }); }
function hideLoading() { wx.hideLoading(); }

function showConfirm(title, content) {
  return new Promise((resolve) => {
    wx.showModal({ title, content, confirmColor: '#00A693',
      success: (res) => resolve(res.confirm),
      fail: () => resolve(false)
    });
  });
}

// ============ 图片压缩 ============

/**
 * 前端压缩图片到指定长边尺寸（使用离屏 Canvas）
 * @param {string} filePath - 原图临时路径
 * @param {number} maxWidth - 长边最大像素 (默认1080)
 * @param {number} quality - JPEG 压缩质量 0-1 (默认0.8)
 * @returns {Promise<string>} 压缩后的临时文件路径，失败时返回原图路径
 */
function compressImage(filePath, maxWidth = 1080, quality = 0.8) {
  return new Promise((resolve) => {
    wx.getImageInfo({
      src: filePath,
      success: (info) => {
        const ratio = Math.min(maxWidth / info.width, maxWidth / info.height, 1);
        // 原图已小于目标尺寸，不压缩
        if (ratio >= 1) {
          resolve(filePath);
          return;
        }
        const w = Math.round(info.width * ratio);
        const h = Math.round(info.height * ratio);
        try {
          const canvas = wx.createOffscreenCanvas({ type: '2d', width: w, height: h });
          const ctx = canvas.getContext('2d');
          const img = canvas.createImage();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, w, h);
            wx.canvasToTempFilePath({
              canvas,
              x: 0, y: 0, width: w, height: h,
              destWidth: w, destHeight: h,
              fileType: 'jpg',
              quality,
              success: (res) => resolve(res.tempFilePath),
              fail: (err) => {
                console.warn('[compressImage] canvasToTempFilePath failed:', err);
                resolve(filePath);
              }
            });
          };
          img.onerror = (err) => {
            console.warn('[compressImage] img.onerror:', err);
            resolve(filePath);
          };
          img.src = filePath;
        } catch (e) {
          console.warn('[compressImage] offscreenCanvas not supported:', e);
          // 降级：直接返回原图
          resolve(filePath);
        }
      },
      fail: (err) => {
        console.warn('[compressImage] getImageInfo failed:', err);
        resolve(filePath);
      }
    });
  });
}

/**
 * 获取文件大小（字节）
 * @param {string} filePath
 * @returns {Promise<number>} 文件大小（字节），失败时返回 0
 */
function getFileSize(filePath) {
  return new Promise((resolve) => {
    wx.getFileInfo({ filePath, success: (res) => resolve(res.size), fail: () => resolve(0) });
  });
}

/**
 * 压缩图片到目标尺寸并保证文件不超过 maxSizeKB
 * 先缩放到 1080P（长边1080px），质量80%，然后循环降质直到 ≤ maxSizeKB
 * @param {string} filePath - 原图临时路径
 * @param {number} maxSizeKB - 最大文件大小 (KB)，默认500
 * @returns {Promise<string>} 压缩后的临时文件路径
 */
async function compressImageToSize(filePath, maxSizeKB = 500) {
  // 第1步：缩放到 1080px 长边，质量 80%
  let compressed = await compressImage(filePath, 1080, 0.8);
  
  let size = await getFileSize(compressed);
  if (size === 0) return filePath; // 读取大小失败，返回原图
  if (size <= maxSizeKB * 1024) return compressed;
  
  // 第2步：逐级降质，0.8 → 0.7 → 0.6 → 0.5 → 0.4 → 0.3
  for (let q = 0.7; q >= 0.3; q -= 0.1) {
    compressed = await compressImage(compressed, 1080, q);
    size = await getFileSize(compressed);
    if (size <= maxSizeKB * 1024) return compressed;
  }
  
  return compressed;
}


// ===== 校园成就 =====
async function getAchievementDetail(trackKey) {
  const res = await request('GET', `/api/achievement/${trackKey}`, null, true);
  if (res.success && res.data) {
    return { ...res.data, items: res.data.items || [], success: true };
  }
  return res;
}

async function submitAchievement(trackKey, itemKey, data) {
  return request('POST', `/api/achievement/${trackKey}/${itemKey}/submit`, data, true);
}

// 提交成就审核（发布页用）
async function submitAchievementPost(data) {
  return request('POST', '/api/achievement/submissions', data, true);
}

// 获取我的成就提交记录
async function getMyAchievementSubmissions() {
  const res = await request('GET', '/api/achievement/submissions', null, true);
  if (res && res.success) {
    return { success: true, list: res.data || res.list || [] };
  }
  return res;
}

async function getAchievementProgress() {
  // 后端返回 { success, data: { tracks, unlockedCount, totalCount, progressPercent } }
  // tracks[].recent[].unlockedAt 为该赛道最近 3 条已通过审核的解锁时间
  const res = await request('GET', '/api/achievement/progress', null, true);
  if (res && res.success && res.data) {
    return {
      success: true,
      tracks: res.data.tracks || [],
      unlockedCount: res.data.unlockedCount || 0,
      totalCount: res.data.totalCount || 0,
      progressPercent: res.data.progressPercent || 0,
    };
  }
  return res;
}

// ===== 表情包 =====
function getStickerPacks() {
  return request('GET', '/api/stickers/packs');
}
function getStickerPack(packId) {
  return request('GET', `/api/stickers/pack/${packId}`);
}
function getEmojiList() {
  return request('GET', '/api/stickers/emoji/list');
}

// ===== 备注 =====
async function getRemark(targetId, targetType = 'user') {
  return request('GET', `/api/remarks?targetId=${encodeURIComponent(targetId)}&targetType=${targetType}`);
}
async function setRemark(targetId, remark, targetType = 'user') {
  return request('PUT', '/api/remarks', { targetId, remark, targetType });
}
async function batchGetRemarks(items) {
  return request('POST', '/api/remarks/batch', { items });
}

// ===== 校园题库 =====
async function getQuestionbankList(params = {}) {
  const parts = [`page=${params.page || 1}`, `pageSize=${params.pageSize || 100}`];
  if (params.category && params.category !== '全部') parts.push(`category=${encodeURIComponent(params.category)}`);
  if (params.keyword) parts.push(`keyword=${encodeURIComponent(params.keyword)}`);
  const qs = '?' + parts.join('&');
  const res = await request('GET', `/api/module/questionbank${qs}`, null, false);
  if (res.success && res.data) {
    const list = (res.data.list || []).map(fixImageUrls);
    return { ...res.data, list, success: true };
  }
  return res;
}

async function getQuestionbankDetail(id) {
  const res = await request('GET', `/api/module/questionbank/${id}`, null, false);
  if (res.success && res.data) return { ...res, data: fixImageUrls(res.data) };
  return res;
}

async function submitQuestionbank(data) {
  return request('POST', '/api/module/questionbank/submit', data, true);
}

async function getMyQuestionbanks(params = {}) {
  const qs = `?page=${params.page || 1}&pageSize=${params.pageSize || 20}`;
  const res = await request('GET', `/api/module/questionbank/my${qs}`, null, true);
  if (res.success && res.data) {
    const list = (res.data.list || []).map(fixImageUrls);
    return { ...res.data, list, success: true };
  }
  return res;
}

// ===== 校园图鉴 =====
async function getGuideCategories() {
  const res = await request('GET', '/api/guide/categories', null, false);
  if (res.success && res.data) return { ...res, data: fixImageUrls(res.data) };
  return res;
}

async function getGuideFeed(params = {}) {
  const parts = [`page=${params.page || 1}`, `pageSize=${params.pageSize || 20}`];
  if (params.category) parts.push(`category=${encodeURIComponent(params.category)}`);
  const qs = '?' + parts.join('&');
  const res = await request('GET', `/api/guide/feed${qs}`, null, false);
  if (res.success && res.data) {
    const list = (res.data.list || []).map(fixImageUrls);
    return { ...res.data, list, success: true };
  }
  return res;
}

async function getGuideAll(params = {}) {
  const parts = [`page=${params.page || 1}`, `pageSize=${params.pageSize || 50}`];
  if (params.category && params.category !== 'all') parts.push(`category=${encodeURIComponent(params.category)}`);
  if (params.keyword) parts.push(`keyword=${encodeURIComponent(params.keyword)}`);
  const qs = '?' + parts.join('&');
  const res = await request('GET', `/api/guide/all${qs}`, null, false);
  if (res.success && res.data) {
    const list = (res.data.list || []).map(fixImageUrls);
    return { ...res.data, list, success: true };
  }
  return res;
}

async function submitGuideEntry(data) {
  return request('POST', '/api/guide/submit', data, true);
}

async function getMyGuideEntries(params = {}) {
  const qs = `?page=${params.page || 1}&pageSize=${params.pageSize || 20}`;
  const res = await request('GET', `/api/guide/my${qs}`, null, true);
  if (res.success && res.data) {
    const list = (res.data.list || []).map(fixImageUrls);
    return { ...res.data, list, success: true };
  }
  return res;
}

module.exports = {
  // 认证
  wxLogin, refreshToken, logout, phoneLogin, register, silentReLogin,
  // 用户
  getUserProfile, upsertUser, searchUsers, getUserStatistics, getCreditRecords, bindPhone, bindWechat, sendCode,
  // 拼车
  getCarpoolList, getCarpoolDetail, createCarpool, updateCarpool, deleteCarpool,
  joinCarpool, cancelJoinCarpool, endCarpool, favoriteCarpool, unfavoriteCarpool,
  getMyCarpools, getMyJoined, getMyFavorites,
  // 通知
  getNotifications, getUnreadCount, markAllNotificationsRead, markNotificationRead, deleteNotification,
  // 消息
  getConversations, getMessages, sendMessage, markMessageRead, recallMessage, getUnreadMessageCount, hideConversation, hideMessage,
  getOnlineUsers, getStrangerStatus, markConversationRead,
  // 群聊
  getMyGroupChats, getGroupInfo, getGroupMessages, sendGroupMessage, markGroupRead,
  // 评价
  getUserReviews, getMyReviews, createReview, deleteReview,
  // 投诉
  createComplaint, getMyComplaints, getComplaintDetail, submitAppeal,
  // 反馈
  createFeedback, getMyFeedback, getFeedbackDetail, rateFeedback, closeFeedback,
  // 联系作者
  createContactMessage, getMyContactMessages,
  // 推荐
  getHotRoutes, getRecommendEstimate, getRecommendLocations, getNearbyUsers, getRecommendForMe,
  // 食堂推荐
  getFoodRecommendations, createFoodPost, recommendFood, getFoodDetail,
  // 食堂管理
  getCanteens, getStalls, getStallDetail, getStallMenu, submitStallReview, getMyStallReview,
  // 公告
  getAnnouncements, getAnnouncementDetail, likeAnnouncement, getAnnouncementComments, addAnnouncementComment, deleteAnnouncementComment,
  // 模块
  getModuleList, getModuleDetail, createModulePost, updateModulePost, deleteModulePost,
  toggleModuleFavorite, closeModulePost, takeModulePost, getModuleReplies, createModuleReply, deleteModuleReply,
  getMyModulePosts, getMyTakenPosts, getMyModuleFavorites, getModuleStats,
  completeModulePost,
  getMyAllPosts, getMyAllFavorites, getHallTasks, getHotTasks,
  // 备注
  getRemark, setRemark, batchGetRemarks,
  // 校园题库
  getQuestionbankList, getQuestionbankDetail, submitQuestionbank, getMyQuestionbanks,
  // 校园图鉴
  getGuideCategories, getGuideFeed, getGuideAll, submitGuideEntry, getMyGuideEntries,
  // 表情包
  getStickerPacks, getStickerPack, getEmojiList,
  // 成就
  getAchievementDetail, submitAchievement, getAchievementProgress,
  submitAchievementPost, getMyAchievementSubmissions,
  // 上传
  uploadAvatar, uploadImage, uploadImages,
  // 拼车标签池
  getCarpoolTags,
  // 工具
  formatTime, formatDate, timeAgo, showToast, showLoading, hideLoading, showConfirm,
  fixUrl, fixImageUrls, formatTimeRange,
  compressImage, compressImageToSize, getFileSize, API_BASE,
};
