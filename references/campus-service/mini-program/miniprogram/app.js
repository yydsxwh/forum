const api = require('./utils/api');

App({
  onLaunch(options) {
    // 兼容 wx.getWindowInfo 与 wx.getSystemInfoSync（真机上某些基础库版本会抛）
    let windowInfo;
    try {
      if (typeof wx.getWindowInfo === 'function') {
        windowInfo = wx.getWindowInfo();
      } else {
        windowInfo = wx.getSystemInfoSync();
      }
    } catch (e) {
      windowInfo = { statusBarHeight: 44, screenWidth: 375, windowWidth: 375, windowHeight: 667 };
    }
    if (!windowInfo || !windowInfo.statusBarHeight) {
      windowInfo = { statusBarHeight: 44, screenWidth: 375, windowWidth: 375, windowHeight: 667 };
    }
    this.globalData.statusBarHeight = windowInfo.statusBarHeight;
    this.globalData.screenWidth = windowInfo.screenWidth;
    this.globalData.navBarHeight = windowInfo.statusBarHeight + 44;

    // 处理从分享卡片进来的分包页面重定向
    // 页面 onLoad options 在冷启动分享场景下不可靠，改用 App.onLaunch options.query
    if (options && options.query && options.query.sp) {
      this.globalData._shareRedirect = options.query.sp;
    }

    // 版本更新检测（任何一步抛都不影响 app 启动）
    try {
      const updateManager = wx.getUpdateManager();
      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已就绪，是否重启应用？',
          success: (res) => {
            if (res.confirm) updateManager.applyUpdate();
          }
        });
      });
    } catch (e) { /* 静默 */ }

    try { this.restoreLoginState(); } catch (e) { /* 静默 */ }
    try {
      if (this.globalData.isLogin) this.silentLogin();
    } catch (e) { /* 静默 */ }
    try { this.startUnreadPolling(); } catch (e) { /* 静默 */ }
    // 注册 shared base 供分包页面使用
    try { this.globalData._sharedBase = require('./pages/_shared/base'); } catch (e) { /* 静默 */ }
  },

  // 处理从分享卡片进来的分包页面重定向（App.onShow 比页面 onLoad 更可靠）
  onShow(options) {
    const sp = this.globalData._shareRedirect;
    if (!sp) return;
    this.globalData._shareRedirect = null;  // 消费后立即清空，防止重复跳转
    const target = '/subpkg/' + sp.replace(/_/g, '/');
    // 稍等片刻确保首页视图已就绪，再跳转子包页面
    setTimeout(() => {
      wx.navigateTo({
        url: target,
        fail: function (err) {
          console.warn('[app.redirect] navigateTo 失败:', err);
        },
      });
    }, 800);
  },

  restoreLoginState() {
    const userInfo = wx.getStorageSync('userInfo');
    const token = wx.getStorageSync('token');
    if (userInfo && token) {
      this.globalData.userInfo = userInfo;
      this.globalData.token = token;
      this.globalData.isLogin = true;
    }
  },

  // 静默登录：通过 wx.login 获取最新 token
  async silentLogin() {
    try {
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({ success: resolve, fail: reject });
      });
      if (!loginRes.code) return;

      const result = await api.wxLogin(loginRes.code);
      if (result && result.success && result.data) {
        // 静默获取到了 JWT token
        const userData = result.data.user;
        if (userData) {
          const userInfo = {
            _id: userData._id,
            user_id_code: userData.user_id_code || '',
            nickName: userData.nickName || '微信用户',
            avatarUrl: api.fixUrl(userData.avatarUrl) || '',
            creditScore: userData.creditScore || 100,
            tripCount: userData.tripCount || 0,
            goodRate: userData.goodRate || 100,
          };
          wx.setStorageSync('userInfo', userInfo);
          this.globalData.userInfo = userInfo;
          this.globalData.isLogin = true;

          // 检测是否需要完善资料（昵称或头像为空时才提示）
          const noAvatar = !userData.avatarUrl;
          const noNick = !userData.nickName;
          this.globalData.needProfile = noAvatar || noNick;
        }
        if (result.data.refreshToken) wx.setStorageSync('refreshToken', result.data.refreshToken);
        console.log('静默登录成功');
      }
    } catch (err) {
      console.log('静默登录失败:', err);
    }
  },

  // 完整登录（用户主动点击登录按钮）
  async doLogin(userData) {
    try {
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({ success: resolve, fail: reject });
      });
      if (!loginRes.code) {
        return { success: false, error: '获取微信登录凭证失败' };
      }

      // 只传用户主动填写的资料，不传空默认值以免覆盖后端已有数据
      const profileData = {};
      if (userData.nickName) profileData.nickName = userData.nickName;
      if (userData.avatarUrl) profileData.avatarUrl = userData.avatarUrl;
      if (userData.gender) profileData.gender = userData.gender;

      // 调用后端微信登录接口（自动获取 JWT token）
      const result = await api.wxLogin(loginRes.code, profileData);

      if (!result || !result.success) {
        return { success: false, error: result?.message || '微信登录失败' };
      }

      const user = result.data.user;
      const localUserInfo = {
        _id: user._id,
        user_id_code: user.user_id_code || '',
        nickName: user.nickName || userData.nickName || '微信用户',
        avatarUrl: api.fixUrl(user.avatarUrl) || userData.avatarUrl || '',
        creditScore: user.creditScore || 100,
        tripCount: user.tripCount || 0,
        goodRate: user.goodRate || 100,
      };

      wx.setStorageSync('userInfo', localUserInfo);
      this.globalData.userInfo = localUserInfo;
      this.globalData.isLogin = true;
      if (result.data.refreshToken) wx.setStorageSync('refreshToken', result.data.refreshToken);

      // 判断是否需要完善资料：仅当头像或昵称为空时才提示
      const needProfile = !user.avatarUrl || !user.nickName;

      return { success: true, needProfile };
    } catch (err) {
      console.error('登录失败:', err);
      return { success: false, error: err.message || '登录失败' };
    }
  },

  globalData: {
    statusBarHeight: 0,
    screenWidth: 375,
    navBarHeight: 64,
    userInfo: null,
    isLogin: false,
    token: '',
    // ===== 统一未读计数（5 秒独立轮询） =====
    unreadMsg: 0,        // tabbar 角标 = notif + chat（不含 express）
    unreadNotif: 0,      // 通知未读
    unreadChat: 0,       // 私信未读
    unreadExpress: 0,    // 快递任务 = 待完成 + 我的发布
    // 防止轮询竞态：标记最后一次"全部已读"的时间戳
    _notifClearedAt: 0,
    // 分享卡片进来的分包重定向目标（sp 参数值），onShow 消费后清空
    _shareRedirect: null,
    // ===== 当前 tab 索引（custom-tab-bar 跨实例共享） =====
    _currentTab: 0,
  },

  // ===== 统一未读轮询（5 秒一次，独立于页面刷新） =====
  startUnreadPolling() {
    this.stopUnreadPolling();
    // 首次立即执行一次
    if (this.globalData.isLogin) {
      this._unreadPollLoop();
      this._initExpressBadge();
    }
    // 每 5 秒轮询
    this._unreadPollTimer = setInterval(() => {
      if (this.globalData.isLogin) this._unreadPollLoop();
    }, 5000);
  },

  stopUnreadPolling() {
    if (this._unreadPollTimer) { clearInterval(this._unreadPollTimer); this._unreadPollTimer = null; }
  },

  async _unreadPollLoop() {
    try {
      const [notifRes, convRes] = await Promise.all([
        api.getNotifications().catch(() => null),
        api.getConversations().catch(() => null),
      ]);

      // 通知未读（排除 type=new_message，这类通知在通知页会被过滤掉）
      let notifUnread = 0;
      if (notifRes && notifRes.list) {
        notifUnread = notifRes.list.filter(n => !n.isRead && n.type !== 'new_message').length;
      }

      // 私信未读
      let chatUnread = 0;
      if (convRes && convRes.success && convRes.list) {
        chatUnread = convRes.list.reduce((sum, c) => sum + (c.unreadCount || c.unread || 0), 0);
      }

      // tabbar 消息角标 = 通知 + 私信（快递角标由 express 页面独自管理）
      const msgTotal = notifUnread + chatUnread;

      // 更新 globalData（通知未读加竞态保护：刚全部已读 5 秒内忽略轮询结果）
      const sinceCleared = Date.now() - (this.globalData._notifClearedAt || 0);
      if (sinceCleared < 5000 && notifUnread > 0) {
        // 刚清零过，保持 0，不覆盖
      } else {
        this.globalData.unreadNotif = notifUnread;
      }
      this.globalData.unreadChat = chatUnread;
      this.globalData.unreadMsg = msgTotal;

      // 更新自定义 tabbar 角标
      this._updateTabBarBadge(msgTotal);

      // 如果当前在消息页，同步推送红点和列表
      this._pushToMessagePage(notifUnread, chatUnread);
    } catch (e) { /* 静默失败 */ }
  },

  /** 消息页在视图栈顶部时，将轮询结果直接推给它，消除双定时器延迟 */
  _pushToMessagePage(notifUnread, chatUnread) {
    try {
      const pages = getCurrentPages();
      const curPage = pages[pages.length - 1];
      if (curPage && curPage.route === 'pages/message/index' && typeof curPage._syncFromGlobal === 'function') {
        curPage._syncFromGlobal(notifUnread, chatUnread);
      }
    } catch (e) { /* 静默 */ }
  },

  // ===== 启动时一次性加载快递角标（跟 express 页面内部同逻辑） =====
  async _initExpressBadge() {
    try {
      const [takenRes, publishRes] = await Promise.all([
        api.getMyTakenPosts('express', { page: 1, pageSize: 50 }).catch(() => null),
        api.getMyModulePosts('express', { page: 1, pageSize: 50 }).catch(() => null),
      ]);
      const takenList = (takenRes && takenRes.list) || [];
      const publishList = (publishRes && publishRes.list) || [];

      // 待完成 = 我接的单里 status != 'resolved'
      const pendingCount = takenList.filter(i => i.status !== 'resolved').length;

      // 我的发布 = 排除已结束/已取消 + 自动关闭逻辑（跟 express 页面完全一致）
      const now = Date.now();
      const TWO_DAYS = 48 * 60 * 60 * 1000;
      const TWELVE_HOURS = 12 * 60 * 60 * 1000;
      const autoIds = new Set();
      for (const item of publishList) {
        const created = item.createTime ? new Date(item.createTime).getTime() : 0;
        if (!created) continue;
        // 发布超过2天无人接单 → 不计入
        if (item.status === 'active' && now - created > TWO_DAYS) { autoIds.add(item._id || item.id); continue; }
        // 已接单超过12小时 → 不计入
        if (item.status === 'closed' && item.extra && item.extra.taker) {
          const takenTime = item.updatedAt ? new Date(item.updatedAt).getTime() : created;
          if (now - takenTime > TWELVE_HOURS) { autoIds.add(item._id || item.id); continue; }
        }
      }
      const publishedCount = publishList.filter(i => {
        if (i.status === 'resolved' || i.status === 'cancelled') return false;
        if (autoIds.has(i._id || i.id)) return false;
        return true;
      }).length;

      this.globalData.unreadExpress = pendingCount + publishedCount;
    } catch (e) { /* 静默 */ }
  },

  _updateTabBarBadge(total) {
    const pages = getCurrentPages();
    // 遍历所有页面，找到有 getTabBar 的 tab 页面来更新角标
    for (let i = pages.length - 1; i >= 0; i--) {
      const page = pages[i];
      if (page && typeof page.getTabBar === 'function') {
        const tabbar = page.getTabBar();
        if (tabbar && tabbar.updateUnread) {
          tabbar.updateUnread(total);
          return;
        }
      }
    }
  },
});
