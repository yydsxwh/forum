// pages/mine/mine.js
console.warn('===== MINE.JS V3 LOADED - 2026-06-23 00:01 =====');
const app = getApp();
const api = require('../../utils/api');

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 64,
    userInfo: null,
    isLogin: false,
    stats: { creditScore: 100, tripCount: 0, goodRate: 100 },
    showAboutModal: false,
    showProfileModal: false,
    avatarInitial: '',
    profileInfo: { realName: '', phone: '', wechat_id: '', qq: '', email: '', department: '', grade: '', bio: '' },
    menuItems: [
      { key: 'my_publish', icon: 'publish', label: '我发布的' },
      { key: 'my_joined', icon: 'joined', label: '我参与的' },
      { key: 'my_favorites', icon: 'star', label: '我的收藏' },
      { key: 'my_reviews', icon: 'chat', label: '我的评价' },
      { key: 'notifications', icon: 'bell', label: '消息通知', badge: 0 },
      { key: 'history', icon: 'clock', label: '历史同行' },
    ],
    safeItems: [
      { key: 'search_user', icon: 'search', label: '搜索用户' },
      { key: 'recommend', icon: 'target', label: '推荐' },
      { key: 'complaint', icon: 'complaint', label: '投诉' },
      { key: 'feedback', icon: 'feedback', label: '反馈' },
      { key: 'bind_phone', icon: 'phone', label: '绑定手机' },
      { key: 'share_trip', icon: 'share', label: '行程分享' },
      { key: 'safety_tips', icon: 'shield', label: '安全须知' },
      { key: 'about', icon: 'info', label: '关于' },
      { key: 'contact', icon: 'mail', label: '联系作者' },
      { key: 'emergency', icon: 'sos', label: '一键报警', danger: true },
      { key: 'logout', icon: 'logout', label: '退出登录', danger: true },
    ],
    showLoginModal: false,
    isFirstVisit: true,
  },

  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight, navBarHeight: app.globalData.navBarHeight });
  },

  onShow() {
    this.loadUserInfo();
  },

  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo');
    const isLogin = !!(userInfo && app.globalData.isLogin);
    if (userInfo && isLogin) {
      // 计算头像占位文字（昵称首字）
      const nick = userInfo.nickName || '';
      const avatarInitial = nick ? nick.charAt(0) : '';
      this.setData({
        userInfo, isLogin: true, showLoginModal: false, avatarInitial,
        stats: { creditScore: userInfo.creditScore || 100, tripCount: userInfo.tripCount || 0, goodRate: userInfo.goodRate || 100 },
      });
      this.checkNotifications();
      this.loadStats();
      this.loadProfileInfo();

      // 首次登录资料不完整，弹出完善资料提示
      if (app.globalData.needProfile) {
        app.globalData.needProfile = false; // 只弹一次
        this.setData({ showProfileModal: true });
      }
    } else {
      this.setData({ userInfo: null, isLogin: false, avatarInitial: '', stats: { creditScore: 100, tripCount: 0, goodRate: 100 } });
    }
  },

  async loadStats() {
    const res = await api.getUserStatistics();
    if (res.success && res.data) {
      this.setData({ stats: { creditScore: res.data.creditScore || 100, tripCount: res.data.tripCount || 0, goodRate: res.data.goodRate || 100 } });
    }
  },

  async loadProfileInfo() {
    try {
      const res = await api.getUserProfile();
      if (res && res.data) {
        const d = res.data;
        this.setData({
          profileInfo: {
            realName: d.realName || '',
            phone: d.phone || '',
            wechat_id: d.wechat_id || '',
            qq: d.qq || '',
            email: d.email || '',
            department: d.department || '',
            grade: d.grade || '',
            bio: d.bio || '',
          }
        });
      }
    } catch (e) { /* 静默 */ }
  },

  async checkNotifications() {
    try {
      const res = await api.getNotifications();
      const menuItems = [...this.data.menuItems];
      const notifItem = menuItems.find(m => m.key === 'notifications');
      if (notifItem) notifItem.badge = res.unread || 0;
      this.setData({ menuItems });
    } catch (err) {}
  },

  goLogin() { wx.navigateTo({ url: '/subpkg/login/login?from=mine' }); },
  closeLoginModal() { this.setData({ showLoginModal: false }); },
  confirmLogin() { this.setData({ showLoginModal: false }); wx.navigateTo({ url: '/subpkg/login/login?from=mine' }); },

  editProfile() {
    // 登录拦截已移除（演示模式）
    wx.navigateTo({ url: '/subpkg/profile-edit/profile-edit' });
  },

  goEditInfo() {
    wx.navigateTo({ url: '/subpkg/profile-edit/profile-edit' });
  },

  tapMenu(e) {
    const { key } = e.currentTarget.dataset;
    // 登录拦截已移除（演示模式）
    switch (key) {
      case 'my_publish': wx.navigateTo({ url: `/subpkg/my-list/my-list?type=publish&title=${encodeURIComponent('我发布的')}` }); break;
      case 'my_joined': wx.navigateTo({ url: `/subpkg/my-list/my-list?type=joined&title=${encodeURIComponent('我参与的')}` }); break;
      case 'my_favorites': wx.navigateTo({ url: '/subpkg/favorites/favorites' }); break;
      case 'my_reviews': wx.navigateTo({ url: '/subpkg/my-list/my-list?type=reviews&title=' + encodeURIComponent('我的评价') }); break;
      case 'notifications': wx.navigateTo({ url: `/subpkg/my-list/my-list?type=notifications&title=${encodeURIComponent('消息通知')}` }); break;
      case 'history': wx.navigateTo({ url: `/subpkg/my-list/my-list?type=history&title=${encodeURIComponent('历史同行')}` }); break;
    }
  },

  tapSafe(e) {
    const { key } = e.currentTarget.dataset;
    // 登录拦截已移除（演示模式）
    switch (key) {
      case 'search_user': wx.navigateTo({ url: '/subpkg/user-search/user-search' }); break;
      case 'recommend': wx.navigateTo({ url: '/subpkg/recommend/recommend' }); break;
      case 'complaint': wx.navigateTo({ url: '/subpkg/complaint/complaint' }); break;
      case 'feedback': wx.navigateTo({ url: '/subpkg/feedback/feedback' }); break;
      case 'favorites': wx.navigateTo({ url: '/subpkg/favorites/favorites' }); break;
      case 'bind_phone': wx.navigateTo({ url: '/subpkg/bind-phone/bind-phone' }); break;
      case 'share_trip': this.shareTrip(); break;
      case 'safety_tips': this.showSafetyTips(); break;
      case 'about': this.showAbout(); break;
      case 'contact': wx.navigateTo({ url: '/subpkg/contact/contact' }); break;
      case 'emergency': this.callEmergency(); break;
      case 'logout': this.doLogout(); break;
    }
  },

  shareTrip() {
    const userInfo = this.data.userInfo;
    // 登录拦截已移除（演示模式）
    // 使用微信原生分享能力，打开分享面板
    wx.showActionSheet({
      itemList: ['分享给微信好友', '分享到朋友圈', '复制行程信息'],
      success: (res) => {
        if (res.tapIndex === 2) {
          // 复制行程信息
          wx.setClipboardData({
            data: `我在「同行鸭」上发布了行程，来一起拼车吧！`,
            success: () => api.showToast('已复制分享文案', 'success')
          });
        } else if (res.tapIndex === 0) {
          // 引导用户点击右上角分享
          api.showToast('请点击右上角「···」选择分享给好友', 'none', 3000);
        } else if (res.tapIndex === 1) {
          // 引导用户点击右上角分享到朋友圈
          api.showToast('请点击右上角「···」选择分享到朋友圈', 'none', 3000);
        }
      }
    });
  },

  showAbout() {
    this.setData({ showAboutModal: true });
  },

  closeAbout() {
    this.setData({ showAboutModal: false });
  },

  closeProfileModal() {
    this.setData({ showProfileModal: false });
  },

  goCompleteProfile() {
    this.setData({ showProfileModal: false });
    wx.navigateTo({ url: '/subpkg/profile-edit/profile-edit' });
  },

  onShareAppMessage() {
    return {
      title: '我在「同行鸭」上发布了行程，来一起拼车吧！',
      path: '/pages/index/index',
      imageUrl: ''
    };
  },

  onShareTimeline() {
    return {
      title: '同行鸭 - {{SCHOOL_NAME}}校园拼车平台',
      path: '/pages/index/index',
    };
  },

  callEmergency() {
    wx.showModal({ title: '确认报警', content: '将拨打110报警电话，确认继续？', confirmText: '确认报警', confirmColor: '#FF5A5F', cancelText: '取消', success: (res) => { if (res.confirm) { wx.makePhoneCall({ phoneNumber: '110', fail: () => api.showToast('拨号失败') }); } } });
  },

  showSafetyTips() {
    wx.showModal({ title: '安全须知', content: '1. 确认同行人身份信息\n2. 将行程分享给亲友\n3. 选择公共场所集合\n4. 保持通讯畅通\n5. 遇到危险及时报警', showCancel: false, confirmText: '我知道了', confirmColor: '#00A693' });
  },

  async doLogout() {
    const confirmed = await api.showConfirm('退出登录', '确认退出登录吗？');
    if (!confirmed) return;
    api.showLoading('退出中...');
    await api.logout();
    api.hideLoading();
    app.globalData.userInfo = null;
    app.globalData.isLogin = false;
    wx.removeStorageSync('userInfo');
    this.setData({ userInfo: null, isLogin: false, stats: { creditScore: 100, tripCount: 0, goodRate: 100 } });
    api.showToast('已退出登录', 'success');
    // 刷新当前页面，以访客视角展示
    setTimeout(() => this.onShow(), 800);
  },

  onPullDownRefresh() {
    wx.vibrateShort({ type: 'light' });
    this.onShow();
    wx.stopPullDownRefresh();
  },
});
