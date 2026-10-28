// pages/index/index.js — 首页（同行鸭风格·全新重写）
const api = require('../../utils/api');
const app = getApp();
app.globalData._sharedBase = require('../_shared/base'); // 注册到 app，供分包通过 getApp() 获取

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 88,
    schoolName: '{{SCHOOL_NAME}}',
    pageLoading: true,
    heroIndex: 0,

    // 顶部双卡
    needCards: [
      { key: 'need', theme: 'yellow', title: '我有需求', sub: '发布需求 快速解决', btnText: '去发布' },
      { key: 'help', theme: 'mint',   title: '顺手帮',   sub: '任务大厅 有偿兼职', btnText: '去看看' },
    ],

    // 5 列 × 2 行 功能宫格（10 项 3D 拟物）
    serveGrid: [
      { name: '代取代送', serve: 'express',   icon: 'express' },
      { name: '二手市场', serve: 'secondhand', icon: 'secondhand' },
      { name: '校园拼车', serve: 'carpool',   icon: 'carpool' },
      { name: '物品求租', serve: 'rental',    icon: 'rental' },
      { name: '有问必答', serve: 'forum',     icon: 'forum' },
      { name: '失物招领', serve: 'lost',      icon: 'lost' },
      { name: '兼职专区', serve: 'parttime',  icon: 'parttime' },
      { name: '校园地图', serve: 'map',       icon: 'map' },
      { name: '常用电话', serve: 'phone',     icon: 'phone' },
      { name: '校历查询', serve: 'calendar',  icon: 'calendar' },
    ],

    // 5 个便利推荐（横向条）
    recommendStrip: [
      { key: 'food',     theme: 'orange', title: '食堂推荐', sub: '美食不踩雷', icon: 'food' },
      { key: 'questionbank',  theme: 'yellow', title: '校园题库', sub: '刷题备考神器', icon: 'questionbank' },
      { key: 'wash',     theme: 'purple', title: '校园图鉴', sub: '校园图鉴',   icon: 'wash' },
      { key: 'achievement',  theme: 'green',  title: '校园成就', sub: '点亮你的荣誉',   icon: 'achievement' },
      { key: 'tools',    theme: 'blue',   title: '校园工具箱', sub: '生活小助手', icon: 'toolbox' },
    ],

    // 活动进行中
    activityEnrollCount: 328,
    // 校园公益（动态数据，无数据时卡片隐藏）
    charityCard: null,   // { title, subtitle, enrollCount } | null
    // 食堂推荐（动态数据，无数据时卡片隐藏）
    foodTopStall: null, // { name, rating, canteenName } | null

    // 信息公告 Tab
    infoTab: 'bulletin',

    // 通知公告
    notices: [
      { _key: 'pin_1', type: 'bulletin', title: '关于校园拼车功能优化升级的通知', _dateLabel: '05-20', _isNew: true },
      { _key: 'ann_2', type: 'bulletin', title: '暑假放假安排通知',                _dateLabel: '05-18' },
      { _key: 'ann_3', type: 'bulletin', title: '学校体育馆临时闭馆公告',          _dateLabel: '05-15' },
    ],
    pinnedBanner: [
      { id: 'p1', title: '关于校园拼车功能优化升级的通知' },
      { id: 'ann_2', title: '暑假放假安排通知' },
      { id: 'ann_3', title: '学校体育馆临时闭馆公告' },
    ],
    noticeIndex: 0,
    noticeAnimating: false,

    // 大厅任务（聚合列表，从多个任务型模块拉最新 4 条）
    hotTasks: [],

    // 搜索
    searchKeyword: '',
    showSearchOverlay: false,
    searchResults: [],
    searchLoading: false,
    searchSearched: false,
  },

  onLoad() {
    const win = wx.getWindowInfo();
    this.setData({
      statusBarHeight: win.statusBarHeight || 44,
      navBarHeight: (win.statusBarHeight || 44) + 44,
    });
    this.loadNotices();
    this.loadActivityInfo();
    this.loadCharityCard();
    this.loadFoodTopStall();

    // 公告栏轮播定时器（每5秒切换，渐隐渐显）
    this._startNoticeTimer();
  },

  _startNoticeTimer() {
    if (this._noticeTimer) clearInterval(this._noticeTimer);
    this._noticeTimer = setInterval(() => {
      if (!this.data.pinnedBanner || this.data.pinnedBanner.length <= 1) return;
      this.setData({ noticeAnimating: true });
      setTimeout(() => {
        const next = (this.data.noticeIndex + 1) % this.data.pinnedBanner.length;
        this.setData({ noticeIndex: next, noticeAnimating: false });
      }, 400);
    }, 5000);
  },

  onUnload() {
    if (this._noticeTimer) { clearInterval(this._noticeTimer); this._noticeTimer = null; }
  },

  onShow() {
    if (this.getTabBar && this.getTabBar()) this.getTabBar().setActiveTab(0);
    this.loadNotices();
    this.loadActivityInfo();
    this.loadHotTasks();
    this.loadCharityCard();
    this.loadFoodTopStall();

    // 公告栏轮播定时器（每5秒切换，渐隐渐显）
    this._startNoticeTimer();
  },

  // ===== 登录检查 =====
  _requireLogin() {
    // 登录拦截已移除（演示/交付模式），所有功能未登录也可访问
    return true;
  },

  // ===== 大厅任务聚合（首页卡片） =====
  async loadHotTasks() {
    try {
      const list = await api.getHotTasks(4);
      // 给价格做格式化
      const hotTasks = (list || []).map(t => ({
        ...t,
        price: (t.price !== undefined && t.price !== null && t.price !== '') ? Number(t.price) : null,
      }));
      this.setData({ hotTasks });
    } catch (e) { /* silent */ }
  },

  // ===== 校园公益（无真实数据时卡片隐藏） =====
  async loadCharityCard() {
    try {
      const res = await api.getModuleList('charity', { page: 1, pageSize: 1 });
      const list = (res && res.success && res.list) ? res.list : [];
      if (list.length === 0) {
        this.setData({ charityCard: null });
        return;
      }
      const item = list[0];
      // 计算参与人数：取参与/报名数字段，若无则估算
      const enrollCount = item.participantCount || item.viewCount || 0;
      this.setData({
        charityCard: {
          title: item.title || item.name || '爱心公益',
          subtitle: item.content ? item.content.substring(0, 20) : '爱心人士在行动',
          enrollCount,
        },
      });
    } catch (e) { this.setData({ charityCard: null }); }
  },

  // ===== 食堂推荐（默认展示评分最高的档口） =====
  async loadFoodTopStall() {
    try {
      const res = await api.getFoodRecommendations({ sort: 'rating', pageSize: 1 });
      const list = (res && res.list) ? res.list : [];
      if (list.length === 0) {
        this.setData({ foodTopStall: null });
        return;
      }
      const item = list[0];
      const rating = item.rating != null ? Number(item.rating).toFixed(1) : '0.0';
      const canteenName = item.canteenName || item.location_desc || '';
      this.setData({
        foodTopStall: {
          name: item.name || item.title || '校园美食',
          rating,
          canteenName,
        },
      });
    } catch (e) { this.setData({ foodTopStall: null }); }
  },



  // ===== 活动信息 =====
  async loadActivityInfo() {
    try {
      const res = await api.getAnnouncements({ page: 1, pageSize: 1, type: 'activity' }).catch(() => null);
      if (res && res.success && res.list && res.list.length > 0) {
        const item = res.list[0];
        this.setData({
          activityEnrollCount: item.participantCount || item.viewCount || 328,
        });
      }
    } catch (e) { /* silent */ }
  },

  // ===== 通知公告 =====
  async loadNotices() {
    try {
      const annRes = await api.getAnnouncements({ page: 1, pageSize: 10 }).catch(() => ({ success: false }));
      const announcements = (annRes && annRes.success ? annRes.list || [] : []);
      const pinned = announcements.filter(a => a.isTop);
      const normal = announcements.filter(a => !a.isTop);
      const dateLabel = (t) => {
        if (!t) return '';
        try {
          const d = new Date(t);
          if (isNaN(d.getTime())) return '';
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${mm}-${dd}`;
        } catch (e) { return ''; }
      };
      const pinnedItem = pinned[0];
      const merged = [];
      pinned.forEach(a => merged.push({ ...a, _key: 'pin_' + a.id, type: 'bulletin', _dateLabel: dateLabel(a.createTime), _isNew: true }));
      normal.forEach(a => merged.push({ ...a, _key: 'ann_' + a.id, type: 'bulletin', _dateLabel: dateLabel(a.createTime) }));
      merged.sort((a, b) => (b._isNew ? 1 : 0) - (a._isNew ? 1 : 0));
      this.setData({
        notices: merged.slice(0, 3),
        pinnedBanner: (merged && merged.length > 0)
          ? merged.slice(0, 5).map(m => ({ id: m.id || '', title: m.title }))
          : [{ id: '', title: '关于校园拼车功能优化升级的通知' }],
      });
      // API 数据更新后重启轮播定时器
      this.setData({ noticeIndex: 0, noticeAnimating: false });
      this._startNoticeTimer();
    } catch (e) { /* silent */ }
  },

  // ===== 顶部操作 =====
  onSwitchSchool() { if (!this._requireLogin()) return; wx.showToast({ title: '暂不支持切换学校', icon: 'none' }); },
  onOpenMenu() { if (!this._requireLogin()) return; wx.showToast({ title: '菜单开发中', icon: 'none' }); },
  onOpenScan() {
    if (!this._requireLogin()) return;
    wx.scanCode && wx.scanCode({
      success: (res) => { wx.showToast({ title: res.result || '扫码成功', icon: 'none' }); },
      fail: () => { wx.showToast({ title: '扫码取消', icon: 'none' }); },
    });
  },
  onHeroSwiperChange(e) {
    const idx = e.detail.current;
    if (typeof idx !== 'number' || idx === this.data.heroIndex) return;
    this.setData({ heroIndex: idx });
  },

  onHeroCta() {
    if (!this._requireLogin()) return;
    wx.switchTab({ url: '/pages/publish-center/publish-center' });
  },

  // ===== 顶部双卡 =====
  onNeedCardTap(e) {
    if (!this._requireLogin()) return;
    const { key } = e.currentTarget.dataset;
    if (key === 'need') {
      wx.switchTab({ url: '/pages/publish-center/publish-center' });
    } else if (key === 'help') {
      wx.navigateTo({ url: '/subpkg/hall-task/hall-task' });
    }
  },

  // ===== 10 宫格点击 =====
  onServeTap(e) {
    if (!this._requireLogin()) return;
    const { serve } = e.currentTarget.dataset;
    const routes = {
      map: '/subpkg/map/map',
      phone: '/subpkg/yellowpage/yellowpage',
      secondhand: '/subpkg/secondhand/secondhand',
      rental: '/subpkg/rental/rental',
      lost: '/subpkg/lost/lost',
      forum: '/subpkg/forum/forum',
      parttime: '/subpkg/life/parttime/parttime',
      express: '/subpkg/express/express',
      carpool: '/subpkg/carpool/carpool',
      calendar: '/subpkg/calendar/calendar',
    };
    if (routes[serve]) wx.navigateTo({ url: routes[serve] });
    else wx.showToast({ title: '功能即将上线', icon: 'none' });
  },

  // ===== 5 个便利条 =====
  onRecommendTap(e) {
    if (!this._requireLogin()) return;
    const { key } = e.currentTarget.dataset;
    if (key === 'tools') return wx.navigateTo({ url: '/subpkg/tools/tools' });
    if (key === 'wash') return wx.navigateTo({ url: '/subpkg/guide/guide' });
    if (key === 'achievement') return wx.navigateTo({ url: '/subpkg/achievement/achievement' });
    if (key === 'questionbank') return wx.navigateTo({ url: '/subpkg/questionbank/questionbank' });
    if (key === 'food') return wx.navigateTo({ url: '/subpkg/food/food' });
    wx.showToast({ title: '功能即将上线', icon: 'none' });
  },

  // ===== 信息公告 =====
  onInfoTabTap(e) {
    if (!this._requireLogin()) return;
    this.setData({ infoTab: e.currentTarget.dataset.tab });
  },
  onNoticeTap(e) {
    if (!this._requireLogin()) return;
    const { id } = e.currentTarget.dataset;
    if (id) wx.navigateTo({ url: '/subpkg/announcement-detail/announcement-detail?id=' + id });
    else wx.navigateTo({ url: '/subpkg/announcement/announcement' });
  },
  onPinnedBannerTap() {
    if (!this._requireLogin()) return;
    const item = (this.data.pinnedBanner && this.data.pinnedBanner[this.data.noticeIndex]) || {};
    if (item.id) wx.navigateTo({ url: '/subpkg/announcement-detail/announcement-detail?id=' + item.id });
    else wx.navigateTo({ url: '/subpkg/announcement/announcement' });
  },

  // ===== 活动 / 公益 =====
  onActivityTap() { if (!this._requireLogin()) return; wx.navigateTo({ url: '/subpkg/charity/charity' }); },
  onCharityTap() { if (!this._requireLogin()) return; wx.navigateTo({ url: '/subpkg/charity/charity' }); },
  onHotTaskTap() { if (!this._requireLogin()) return; wx.navigateTo({ url: '/subpkg/hall-task/hall-task' }); },
  onHotTaskItemTap(e) {
    if (!this._requireLogin()) return;
    const { id, module: mod } = e.currentTarget.dataset;
    if (!id || !mod) return;
    wx.navigateTo({ url: `/subpkg/${mod}/${mod}?id=${id}` });
  },
  onFoodTap() { if (!this._requireLogin()) return; wx.navigateTo({ url: '/subpkg/food/food' }); },

  // ===== 搜索 =====
  onOpenSearch() {
    if (!this._requireLogin()) return;
    this.setData({ showSearchOverlay: true, searchResults: [], searchSearched: false });
    const kw = (this.data.searchKeyword || '').trim();
    if (kw) { this.setData({ searchLoading: true, searchSearched: true }); this._execSearch(kw); }
  },
  onSearchModalInput(e) { this.setData({ searchKeyword: e.detail.value }); },
  onDoSearch() {
    if (!this._requireLogin()) return;
    const kw = (this.data.searchKeyword || '').trim();
    if (!kw) return;
    this.setData({ searchLoading: true, searchSearched: true });
    this._execSearch(kw);
  },
  async _execSearch(kw) {
    try {
      const [carpoolRes, taskRes, expressRes] = await Promise.all([
        api.getCarpoolList({ keyword: kw, pageSize: 10 }).catch(() => null),
        api.getModuleList('task', { keyword: kw, pageSize: 10 }).catch(() => null),
        api.getModuleList('express', { keyword: kw, pageSize: 10 }).catch(() => null),
      ]);
      const results = [];
      const extract = (res) => { if (!res) return []; if (Array.isArray(res.list)) return res.list; if (res.data && Array.isArray(res.data.list)) return res.data.list; return []; };
      extract(carpoolRes).forEach(i => results.push({ _id: i._id || i.id, type: 'carpool', typeName: '拼车', title: (i.from||'?')+' → '+(i.to||'?'), desc: (i.note||'').substring(0,50), color: '#E91E63' }));
      extract(taskRes).forEach(i => results.push({ _id: i._id || i.id, type: 'task', typeName: '跑腿', title: i.title||'未命名', desc: (i.content||'').substring(0,50), color: '#FF9800' }));
      extract(expressRes).forEach(i => results.push({ _id: i._id || i.id, type: 'express', typeName: '快递', title: i.title||'未命名', desc: (i.content||'').substring(0,50), color: '#FF9500' }));
      this.setData({ searchResults: results, searchLoading: false });
    } catch (e) { this.setData({ searchLoading: false }); }
  },
  onCloseSearch() { this.setData({ showSearchOverlay: false, searchKeyword: '', searchResults: [], searchSearched: false }); },
  onSearchResultTap(e) {
    if (!this._requireLogin()) return;
    const { type, id } = e.currentTarget.dataset;
    this.setData({ showSearchOverlay: false });
    wx.navigateTo({ url: '/subpkg/detail/detail?id=' + id + (type !== 'carpool' ? '&module=' + type : '') });
  },
});