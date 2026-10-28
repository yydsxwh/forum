// pages/main/main.js — 四合一主页面
// 用 swiper 串联首页大厅/发布/消息/我的，左右丝滑切换
const app = getApp();
const api = require('../../utils/api');

const STATUS_MAP = {
  active: '进行中', full: '已满员', ended: '已结束',
  cancelled: '已取消', expired: '已过期',
};

Page({
  data: {
    // ===== 通用 =====
    statusBarHeight: 0,
    screenWidth: 375,
    currentTab: 0,

    // ===== Tab1: 首页大厅 =====
    from: '{{SCHOOL_NAME}}',
    to: '',
    isFromAny: false,
    isToAny: true,
    activeFilter: 'all',
    filterTabs: [
      { label: '全部', value: 'all' },
      { label: '东门', value: '东门' },
      { label: '南门', value: '南门' },
      { label: '西门', value: '西门' },
    ],
    carpoolList: [],
    historyList: [],
    historyFolded: true,
    page: 1,
    hasMore: true,
    loading: false,
    hotRoutes: [],
    hasNotification: false,

    // 地点选择弹窗
    showLocationPopup: false,
    locationPopupType: 'from', // 'from' or 'to'
    commonLocations: ['{{SCHOOL_NAME}}', '{{SCHOOL_CITY}}东站', '{{SCHOOL_CITY}}站', '{{SCHOOL_CITY}}机场', '新世纪广场', '康德商场', '高铁站', '{{SCHOOL_CITY}}学院'],
    displayLocations: [],
    locationSearchText: '',

    // 查找/取消切换
  isSearching: false,

  // ===== 首页模块 =====
  homeModules: [
    { name: '取快递', url: '' },
    { name: '大厅任务', url: '/subpkg/hall-task/hall-task' },
    { name: '失物招领', url: '' },
    { name: '校园论坛', url: '' },
    { name: '二手市集', url: '' },
    { name: '物品短租', url: '' },
    { name: '校园拼车', url: '/subpkg/carpool/carpool' },
    { name: '交换人生', url: '' },
    { name: '打印跑腿', url: '' },
    { name: '校园黄页', url: '' },
    { name: '公告板', url: '/subpkg/announcement/announcement' },
    { name: '爱心公益', url: '' },
  ],
  bannerList: [
    { title: '🚗 校园拼车新上线', sub: '智能匹配 · 安全同行' },
    { title: '🛡️ 实名认证保障', sub: '每笔行程有迹可循' },
    { title: '🎓 {{SCHOOL_NAME}}专属', sub: '同校出行更放心' },
  ],
  latestSystemNotice: '',
  noticesForHome: [],

  // 详情弹窗
    showDetailOverlay: false,
    showDetailAnimating: false,
    detailOverlayData: null,
    detailOverlayLoading: false,
    detailOverlayStatusText: '',
    detailOverlayPriceText: '',
    detailOverlayVehicleText: '',

    // 加入成功弹窗
    showJoinSuccessModal: false,
    joinSuccessCarpoolId: '',
    joinSuccessData: { from: '', to: '', time: '', seats: '', contact: '' },

    // ===== Tab2: 发布 =====
    publishType: 'offer',
    publishFrom: '{{SCHOOL_NAME}}',
    publishTo: '',
    publishEarliestTime: '',
    publishLatestTime: '',
    publishDate: '',
    publishTotalSeats: 2,
    publishRemainSeats: 4,
    publishContact: '',
    publishNote: '',
    publishTags: [],
    showCustomTagInput: false,
    allTags: ['守时', '音乐随缘', '安静乘车', '愿意聊天', '行李少', '顺路带', '自驾顺风', '校车直达', '女生优先', '男生优先', '宠物友好'],
    tagList: [],
    publishCustomTag: '',
    editId: '',
    editMode: false,

    // ===== Tab3: 消息 =====
    groupChats: [],
    displayGroupChats: [],
    totalGroups: 0,
    showAllGroups: false,
    notifications: [],
    displayNotifications: [],
    totalNotifs: 0,
    showAllNotifs: false,
    announcements: [],
    displayAnnouncements: [],
    totalAnnouncements: 0,
    showAllAnnouncements: false,
    mergedNotifs: [],
    mergedTotal: 0,
    onlineUserIds: [],
    notifUnread: 0,
    msgLoading: false,

    // ===== Tab4: 我的 =====
    userInfo: null,
    isLogin: false,
    stats: { creditScore: 100, tripCount: 0, goodRate: 100 },
    menuItems: [],
    safeItems: [],
    showLoginModal: false,
    isFirstVisit: true,
  },

  // ============ 生命周期 ============
  onLoad() {
    const win = wx.getWindowInfo();
    this.setData({
      statusBarHeight: win.statusBarHeight,
      screenWidth: sys.screenWidth,
      'publishFrom': '{{SCHOOL_NAME}}',
    });
    this.buildMenuItems();
    this.buildSafeItems();
    this._buildTagList();
    this.loadHomeNotices();
  },

  onShow() {
    this.refreshUserInfo();
    if (this.data.currentTab === 2) {
      if (app.globalData.isLogin) this.loadMsgData();
      else { const ci = setInterval(() => { if (app.globalData.isLogin) { clearInterval(ci); this.loadMsgData(); } }, 500); setTimeout(() => clearInterval(ci), 5000); }
    }
    if (app.globalData.isLogin) {
      this.checkNotifications();
    }
    this.startMsgPolling();
    this.connectMainWs();
  },

  onHide() { this.stopMsgPolling(); this.disconnectMainWs(); },
  onUnload() { this.stopMsgPolling(); this.disconnectMainWs(); },

  // WebSocket 监听新消息 → 自动刷新消息列表
  _mainWsTask: null, _mainWsRetry: 0,
  connectMainWs() {
    if (this._mainWsRetry > 3) return; // 最多重试3次
    this.disconnectMainWs();
    const token = wx.getStorageSync('access_token');
    if (!token) return;
    const task = wx.connectSocket({
      url: `wss://{{DOMAIN}}/api/ws?token=${token}`,
      tcpNoDelay: true,
      success: () => { this._mainWsRetry = 0; },
      fail: () => { this._mainWsRetry++; }
    });
    task.onMessage((res) => {
      try {
        const data = JSON.parse(res.data);
        if (data.type === 'new_group_msg') this.loadMsgData();
      } catch (e) {}
    });
    task.onClose(() => { this._mainWsRetry++; });
    task.onError(() => {
      this._mainWsRetry++;
      if (this._mainWsRetry <= 3) setTimeout(() => this.connectMainWs(), 8000);
    });
    this._mainWsTask = task;
  },
  disconnectMainWs() {
    if (this._mainWsTask) { try { this._mainWsTask.close({}); } catch(e){} this._mainWsTask = null; }
  },

  // ============ Swiper 控制 ============
  onSwiperChange(e) {
    const idx = e.detail.current;
    // 登录拦截已移除（演示模式）
    this.setData({ currentTab: idx });
    if (idx === 2) {
      if (app.globalData.isLogin) this.loadMsgData();
      else { const ci = setInterval(() => { if (app.globalData.isLogin) { clearInterval(ci); this.loadMsgData(); } }, 500); setTimeout(() => clearInterval(ci), 5000); }
    }
    if (idx === 3) {
      this.refreshUserInfo();
    }
  },

  goPublish() {
    // 登录拦截已移除（演示模式）
    this.setData({ currentTab: 1 });
  },

  switchTab(e) {
    const idx = parseInt(e.currentTarget.dataset.index);
    if (idx === this.data.currentTab) return;
    // 登录拦截已移除（演示模式）
    this.setData({ currentTab: idx });
    if (idx === 2) {
      if (app.globalData.isLogin) this.loadMsgData();
      else { const checkLogin = setInterval(() => { if (app.globalData.isLogin) { clearInterval(checkLogin); this.loadMsgData(); } }, 500); setTimeout(() => clearInterval(checkLogin), 5000); }
    }
    if (idx === 3) this.refreshUserInfo();
  },

  // ============ Tab0: 首页大厅（新） ============
  onModuleTap(e) {
    const { url, name } = e.currentTarget.dataset;
    if (!url) {
      wx.showToast({ title: `${name}即将上线`, icon: 'none', duration: 1500 });
      return;
    }
    wx.navigateTo({ url });
  },

  async loadHomeNotices() {
    // 优先用已缓存数据，否则独立加载
    if (this.data.announcements && this.data.announcements.length > 0) {
      this._refreshHomeNotices();
    } else {
      try {
        const [notifRes, announcementRes] = await Promise.all([
          api.getNotifications().catch(() => ({ success: false })),
          api.getAnnouncements({ page: 1, pageSize: 10 }).catch(() => ({ success: false })),
        ]);
        const notifs = (notifRes.list || notifRes.data || []).slice(0, 10);
        const aList = announcementRes.success ? (announcementRes.list || announcementRes.data || []) : [];
        const announcements = aList.slice(0, 10);
        // 缓存数据
        this.setData({ notifications: notifs, announcements });
      } catch (e) {
        // 静默失败
      }
      this._refreshHomeNotices();
    }
  },

  _refreshHomeNotices() {
    const anns = this.data.announcements || [];
    const notifs = this.data.notifications || [];
    const mergeResult = [];
    if (anns.length > 0) {
      anns.forEach(a => mergeResult.push({ ...a, _sortTime: a.createTime || '', type: 'bulletin' }));
    }
    if (notifs.length > 0) {
      notifs.forEach(n => mergeResult.push({ ...n, _sortTime: n.createTime || '', type: 'notice' }));
    }
    mergeResult.sort((a, b) => (b._sortTime || '').localeCompare(a._sortTime || ''));
    const pinned = mergeResult.filter(m => m.isPinned || m.isTop);
    const unpinned = mergeResult.filter(m => !(m.isPinned || m.isTop));
    const merged = [...pinned, ...unpinned];
    this.setData({ noticesForHome: merged.slice(0, 3) });
    if (merged.length > 0) {
      this.setData({ latestSystemNotice: merged[0].title || merged[0].content || '' });
    }
  },

  _mergeNotifsAndAnnouncements() {
    const anns = this.data.announcements || [];
    const notifs = this.data.notifications || [];
    const mergeResult = [];
    if (anns.length > 0) {
      anns.forEach(a => mergeResult.push({ ...a, _sortTime: a.createTime || '', type: 'bulletin' }));
    }
    if (notifs.length > 0) {
      notifs.forEach(n => mergeResult.push({ ...n, _sortTime: n.createTime || '', type: 'notice' }));
    }
    mergeResult.sort((a, b) => (b._sortTime || '').localeCompare(a._sortTime || ''));
    // 置顶公告永远第一
    const pinned = mergeResult.filter(m => m.isPinned || m.isTop);
    const unpinned = mergeResult.filter(m => !(m.isPinned || m.isTop));
    return [...pinned, ...unpinned];
  },

  onNoticeTap(e) {
    const { id, type, url } = e.currentTarget.dataset;
    if (url) { wx.navigateTo({ url }); return; }
    if (type === 'bulletin' || type === 'notice') {
      this.setData({ currentTab: 2 }); // 切到消息Tab
    }
  },

  // ============ Tab1(原): 拼车大厅（已移至 /subpkg/carpool/carpool） ============
  async loadHallData() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    const params = {
      filterType: this.data.activeFilter,
      page: this.data.page,
      pageSize: 10,
    };
    if (!this.data.isFromAny) params.from = this.data.from;
    if (!this.data.isToAny) params.to = this.data.to;
    const res = await api.getCarpoolList(params);
    let list = res.list || [];
    const myId = app.globalData.userInfo?._id;
    const now = Date.now();
    const thirtyMinMs = 30 * 60 * 1000;
    const tenDaysAgo = now - 10 * 86400000;
    const activeList = [];
    const histList = [];
    list.forEach(item => {
      const creatorId = item.creator?._id || item.creator?.id || item.creator_id;
      const isCreator = item.isCreator != null ? item.isCreator : (myId && String(creatorId) === String(myId));
      const isJoined = item.isJoined != null ? item.isJoined : (isCreator || (item.participants || []).some(p =>
        String(p.user?._id || p.user || p.userId) === String(myId) && p.status !== 'left'
      ));
      const depTs = item.departureTime ? new Date(item.departureTime).getTime() : 0;
      const statusExpired = item.status === 'expired' || item.status === 'ended' || item.status === 'cancelled';
      // 过期判定：状态已结束 或 最早出发时间已过30分钟以上
      const isExpired = statusExpired || (depTs > 0 && now - depTs > thirtyMinMs);
      const enriched = {
        ...item,
        _formattedTime: api.formatTimeRange(item.departureTime),
        _timeAgo: api.timeAgo(item.createTime),
        isCreator, isJoined, isExpired,
        _depTs: depTs,
      };
      if (isExpired && depTs >= tenDaysAgo) {
        histList.push(enriched);
      } else if (!isExpired) {
        activeList.push(enriched);
      }
    });
    // 排序：active 按出发时间升序（距现在最近排最前），无时间(_depTs=0)排最后
    activeList.sort((a, b) => {
      const da = a._depTs || Infinity;
      const db = b._depTs || Infinity;
      return da - db;
    });
    // history：按出发时间降序（最近过期排最前）
    histList.sort((a, b) => b._depTs - a._depTs);

    if (this.data.page === 1) {
      this.setData({ carpoolList: activeList, historyList: histList, hasMore: list.length >= 10, loading: false });
    } else {
      this.setData({
        carpoolList: [...this.data.carpoolList, ...activeList],
        historyList: [...this.data.historyList, ...histList],
        hasMore: list.length >= 10,
        loading: false,
      });
    }
  },

  async loadHotRoutes() {
    const res = await api.getHotRoutes();
    if (res.success && res.data) {
      this.setData({ hotRoutes: (res.data.list || res.data || []).slice(0, 3) });
    }
  },

  _hallPoll: null,
  startHallPolling() {
    this.stopHallPolling();
    this._hallPoll = setInterval(() => {
      if (this.data.currentTab === 0 && this.data.page === 1 && !this.data.loading) {
        this.silentHallRefresh();
      }
    }, 10000);
  },
  stopHallPolling() {
    if (this._hallPoll) { clearInterval(this._hallPoll); this._hallPoll = null; }
  },

  _msgPoll: null,
  startMsgPolling() {
    this.stopMsgPolling();
    this._msgPoll = setInterval(() => {
      if (app.globalData.isLogin && this.data.currentTab === 2) this.loadMsgData();
    }, 8000);
  },
  stopMsgPolling() {
    if (this._msgPoll) { clearInterval(this._msgPoll); this._msgPoll = null; }
  },
  async silentHallRefresh() {
    try {
      const params = { filterType: this.data.activeFilter, page: 1, pageSize: 10 };
      if (!this.data.isFromAny) params.from = this.data.from;
      if (!this.data.isToAny) params.to = this.data.to;
      const res = await api.getCarpoolList(params);
      const now = Date.now();
      const thirtyMinMs = 30 * 60 * 1000;
      const tenDaysAgo = now - 10 * 86400000;
      const activeList = [];
      const histList = [];
      (res.list || []).forEach(item => {
        const depTs = item.departureTime ? new Date(item.departureTime).getTime() : 0;
        const statusExpired = item.status === 'expired' || item.status === 'ended' || item.status === 'cancelled';
        const isExpired = statusExpired || (depTs > 0 && now - depTs > thirtyMinMs);
        const enriched = {
          ...item,
          _formattedTime: api.formatTimeRange(item.departureTime),
          _timeAgo: api.timeAgo(item.createTime),
          isExpired,
          _depTs: depTs,
        };
        if (isExpired && depTs >= tenDaysAgo) {
          histList.push(enriched);
        } else if (!isExpired) {
          activeList.push(enriched);
        }
      });
      activeList.sort((a, b) => {
        const da = a._depTs || Infinity;
        const db = b._depTs || Infinity;
        return da - db;
      });
      histList.sort((a, b) => b._depTs - a._depTs);
      this.setData({ carpoolList: activeList, historyList: histList, hasMore: (res.list || []).length >= 10 });
    } catch (e) {}
  },

  async checkNotifications() {
    try {
      const res = await api.getNotifications();
      if (res && !res._401) this.setData({ hasNotification: (res.unread || 0) > 0 });
    } catch (e) {}
  },

  onHallRefresh() {
    this.setData({ page: 1, carpoolList: [], historyList: [], hasMore: true });
    this.loadHallData();
  },
  onHallLoadMore() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 }, () => this.loadHallData());
    }
  },
  toggleHistory() {
    this.setData({ historyFolded: !this.data.historyFolded });
  },
  selectFilter(e) {
    const v = e.currentTarget.dataset.value;
    if (v === this.data.activeFilter) return;
    this.setData({ activeFilter: v, page: 1, carpoolList: [], historyList: [], hasMore: true });
    this.loadHallData();
  },
  onPickFrom() { this.openLocationPopup('from'); },
  onPickTo() { this.openLocationPopup('to'); },
  swapRoute() {
    const f = this.data.from; const t = this.data.to;
    this.setData({ from: t, to: f, page: 1, carpoolList: [], historyList: [], hasMore: true });
    this.loadHallData();
  },

  // 地点选择弹窗
  openLocationPopup(type) {
    const prefix = type === 'from' ? '任意出发地' : '任意目的地';
    this.setData({ showLocationPopup: true, locationPopupType: type, locationSearchText: '', displayLocations: [prefix, ...this.data.commonLocations] });
  },
  closeLocationPopup() {
    this.setData({ showLocationPopup: false });
  },
  selectLocation(e) {
    const name = e.currentTarget.dataset.name;
    if (name === '任意出发地') {
      this.setData({ isFromAny: true, showLocationPopup: false, page: 1, carpoolList: [], historyList: [], hasMore: true });
    } else if (name === '任意目的地') {
      this.setData({ isToAny: true, showLocationPopup: false, page: 1, carpoolList: [], historyList: [], hasMore: true });
    } else if (this.data.locationPopupType === 'from') {
      this.setData({ from: name, isFromAny: false, showLocationPopup: false, page: 1, carpoolList: [], historyList: [], hasMore: true });
    } else {
      this.setData({ to: name, isToAny: false, showLocationPopup: false, page: 1, carpoolList: [], historyList: [], hasMore: true });
    }
    this.loadHallData();
  },
  onLocationSearchInput(e) {
    this.setData({ locationSearchText: e.detail.value });
  },
  confirmCustomLocation() {
    const text = this.data.locationSearchText.trim();
    if (!text) return;
    if (this.data.locationPopupType === 'from') {
      this.setData({ from: text });
    } else {
      this.setData({ to: text });
    }
    this.setData({ showLocationPopup: false, page: 1, carpoolList: [], historyList: [], hasMore: true });
    this.loadHallData();
  },
  toggleSearch() {
    if (this.data.isSearching) {
      // 取消搜索 → 恢复全部
      this.setData({ isSearching: false, isFromAny: false, isToAny: true, from: '{{SCHOOL_NAME}}', to: '', page: 1, carpoolList: [], historyList: [], hasMore: true });
      this.loadHallData();
    } else {
      // 查找
      this.setData({ isSearching: true, page: 1, carpoolList: [], historyList: [], hasMore: true });
      this.loadHallData();
    }
  },
  navToPicker(type) { /* deprecated */ },
  onHotRoute(e) {
    const { from, to } = e.currentTarget.dataset;
    this.setData({ from: from || '', to: to || '', page: 1, carpoolList: [], hasMore: true });
    this.loadHallData();
  },

  tapHallDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) { return; }
    const idStr = String(id);
    this.openDetailOverlay(idStr);
  },

  // ===== 详情弹窗 =====
  async openDetailOverlay(id) {
    this.setData({ showDetailOverlay: true, showDetailAnimating: false, detailOverlayLoading: true, detailOverlayData: null });
    // 下一帧触发动画
    setTimeout(() => this.setData({ showDetailAnimating: true }), 50);
    const res = await api.getCarpoolDetail(id);
    const d = res && res.data ? res.data : null;
    if (d) {
      const v = d.vehicleInfo || {};
      const vParts = [v.brand, v.color, v.plateNumber].filter(Boolean);
      const hasPrice = d.price != null && d.price > 0;
      // 注入格式化字段供弹窗渲染
      d._formattedTime = api.formatTimeRange(d.departureTime);
      // 已结束/已取消（状态为准，不通过出发时间判断）
      d.isExpired = d.status === 'expired' || d.status === 'ended' || d.status === 'cancelled';
      this.setData({
        detailOverlayData: d,
        detailOverlayLoading: false,
        detailOverlayStatusText: STATUS_MAP[d.status] || d.status || '',
        detailOverlayPriceText: hasPrice ? `¥${d.price}${d.priceNote ? ` (${d.priceNote})` : ''}` : '',
        detailOverlayVehicleText: vParts.join(' · '),
      });
    } else {
      this.setData({ detailOverlayLoading: false });
      api.showToast('加载失败');
    }
  },

  closeDetailOverlay() {
    this.setData({ showDetailAnimating: false });
    setTimeout(() => this.setData({ showDetailOverlay: false, detailOverlayData: null }), 300);
  },

  // 弹窗中立即加入
  async joinFromOverlay() {
    const d = this.data.detailOverlayData;
    if (!d) return;
    const ok = await api.showConfirm('确认加入', `确认加入${d.creator?.nickName || '对方'}的同行吗？`);
    if (!ok) return;
    api.showLoading('加入中...');
    const res = await api.joinCarpool(d._id);
    api.hideLoading();
    if (res.success) {
      // 自动在拼车群发一条消息
      api.sendGroupMessage(d._id, '我加入了这次同行，一起出发吧！').catch(() => {});
      // 打开加入成功弹窗
      this.setData({
        joinSuccessCarpoolId: d._id,
        joinSuccessData: {
          from: d.from || '',
          to: d.to || '',
          time: d._formattedTime || api.formatTime(d.departureTime),
          seats: (d.totalSeats != null) ? `${d.remainSeats}/${d.totalSeats}人` : '',
          contact: d.contact || '',
        },
        showJoinSuccessModal: true,
      });
      this.closeDetailOverlay();
      this.loadHallData();
    } else {
      api.showToast(res.message || '加入失败');
    }
  },

  // 弹窗中取消加入
  async cancelJoinFromOverlay() {
    const d = this.data.detailOverlayData;
    if (!d) return;
    const ok = await api.showConfirm('取消加入', '确定取消加入吗？');
    if (!ok) return;
    api.showLoading('取消中...');
    const res = await api.cancelJoinCarpool(d._id);
    api.hideLoading();
    if (res.success) {
      api.showToast('已取消', 'success');
      this.openDetailOverlay(d._id);
      this.loadHallData();
    } else {
      api.showToast(res.message || '操作失败');
    }
  },

  // 弹窗中收藏
  async favFromOverlay() {
    const d = this.data.detailOverlayData;
    if (!d) return;
    if (d.isFavorited) {
      const res = await api.unfavoriteCarpool(d._id);
      if (res.success) { api.showToast('已取消收藏'); this.openDetailOverlay(d._id); }
    } else {
      const res = await api.favoriteCarpool(d._id);
      if (res.success) { api.showToast('已收藏', 'success'); this.openDetailOverlay(d._id); }
    }
  },

  // 弹窗中删除
  async deleteFromOverlay() {
    const d = this.data.detailOverlayData;
    const ok = await api.showConfirm('取消发布', '取消后参与者将收到通知，确认？');
    if (!ok) return;
    api.showLoading('取消中...');
    const res = await api.deleteCarpool(d._id, '发布者取消');
    api.hideLoading();
    if (res.success) {
      api.showToast('已取消', 'success');
      this.closeDetailOverlay();
      this.loadHallData();
    } else {
      api.showToast(res.message || '操作失败');
    }
  },

  // 弹窗中结束
  async endFromOverlay() {
    const d = this.data.detailOverlayData;
    const ok = await api.showConfirm('结束行程', '结束后将无法再加入，确认？');
    if (!ok) return;
    api.showLoading('处理中...');
    const res = await api.endCarpool(d._id);
    api.hideLoading();
    if (res.success) {
      api.showToast('已结束', 'success');
      this.openDetailOverlay(d._id);
      this.loadHallData();
    } else {
      api.showToast(res.message || '操作失败');
    }
  },

  // 弹窗中复制联系方式
  onCopyContact() {
    const contact = this.data.detailOverlayData?.contact;
    if (!contact) { api.showToast('发布者未提供联系方式'); return; }
    wx.setClipboardData({
      data: String(contact),
      success: () => {
        const m = String(contact).length > 4 ? String(contact).slice(0, 3) + '****' + String(contact).slice(-2) : String(contact);
        api.showToast(`已复制：${m}`, 'success');
      }
    });
  },

  // 弹窗中进入群聊
  goOverlayGroupChat() {
    const carpoolId = this.data.detailOverlayData?._id;
    if (!carpoolId) return;
    wx.navigateTo({ url: `/subpkg/group-chat/group-chat?carpoolId=${carpoolId}` });
  },

  // 弹窗中编辑行程
  editFromOverlay() {
    const d = this.data.detailOverlayData;
    if (!d) return;
    const depTime = d.departureTime ? new Date(d.departureTime) : null;
    this.setData({
      showDetailOverlay: false,
      editId: d._id,
      editMode: true,
      publishType: d.type || 'offer',
      publishFrom: d.from || '{{SCHOOL_NAME}}',
      publishTo: d.to || '',
      publishDate: depTime ? `${depTime.getFullYear()}-${String(depTime.getMonth()+1).padStart(2,'0')}-${String(depTime.getDate()).padStart(2,'0')}` : '',
      publishEarliestTime: depTime ? `${String(depTime.getHours()).padStart(2,'0')}:${String(depTime.getMinutes()).padStart(2,'0')}` : '',
      publishLatestTime: '',
      publishTotalSeats: d.totalSeats || 2,
      publishContact: d.contact || '',
      publishNote: d.note || '',
      publishTags: d.tags || [],
      currentTab: 1,
    });
    this._buildTagList();
    setTimeout(() => this.setData({ detailOverlayData: null }), 300);
  },

  // 弹窗中私聊发布者
  goOverlayChat() {
    const creator = this.data.detailOverlayData?.creator;
    if (!creator) return;
    wx.navigateTo({ url: `/subpkg/chat/chat?userId=${creator._id}&nickName=${encodeURIComponent(creator.nickName)}` });
  },

  // 加入成功弹窗
  closeJoinSuccessModal() {
    this.setData({ showJoinSuccessModal: false });
  },

  goGroupFromJoin() {
    const id = this.data.joinSuccessCarpoolId;
    this.setData({ showJoinSuccessModal: false });
    if (id) wx.navigateTo({ url: `/subpkg/group-chat/group-chat?carpoolId=${id}` });
  },

  onCopyContactFromJoin() {
    const contact = this.data.joinSuccessData?.contact;
    if (!contact) { api.showToast('发布者未提供联系方式'); return; }
    wx.setClipboardData({
      data: String(contact),
      success: () => {
        const m = String(contact).length > 4 ? String(contact).slice(0, 3) + '****' + String(contact).slice(-2) : String(contact);
        api.showToast(`已复制：${m}`, 'success');
      },
      fail: () => api.showToast('复制失败'),
    });
  },

  previewOverlayImage(e) {
    const { url } = e.currentTarget.dataset;
    const images = this.data.detailOverlayData?.images || [];
    if (url) wx.previewImage({ current: url, urls: images });
  },

  async tapHallJoin(e) {
    const { item } = e.currentTarget.dataset;
    if (!item || !item._id) return;
    const ok = await api.showConfirm('确认加入', `确认加入${item.creator.nickName}的同行吗？`);
    if (!ok) return;
    api.showLoading('加入中...');
    const res = await api.joinCarpool(item._id);
    api.hideLoading();
    if (res.success) {
      // 自动在拼车群发一条消息
      const from = item.from || '';
      const to = item.to || '';
      api.sendGroupMessage(item._id, '我加入了这次同行，一起出发吧！').catch(() => {});
      // 打开加入成功弹窗
      this.setData({
        joinSuccessCarpoolId: item._id,
        joinSuccessData: {
          from,
          to,
          time: item._formattedTime || api.formatTime(item.departureTime),
          seats: (item.totalSeats != null) ? `${item.remainSeats}/${item.totalSeats}人` : '',
          contact: item.contact || '',
        },
        showJoinSuccessModal: true,
      });
      this.loadHallData();
    } else {
      api.showToast(res.message || '加入失败');
    }
  },

  async tapHallFavorite(e) {
    const { item } = e.currentTarget.dataset;
    if (item.isFavorited) {
      const res = await api.unfavoriteCarpool(item._id);
      if (res.success) api.showToast('已取消收藏');
    } else {
      const res = await api.favoriteCarpool(item._id);
      if (res.success) api.showToast('已收藏', 'success');
    }
    this.loadHallData();
  },

  // ============ Tab2: 发布 ============
  onPublishTypeChange(e) {
    const t = e.currentTarget.dataset.type;
    if (t !== this.data.publishType) this.setData({ publishType: t });
  },
  onPublishFromInput(e) { this.setData({ publishFrom: e.detail.value }); },
  onPublishToInput(e) { this.setData({ publishTo: e.detail.value }); },
  onPublishSwap() {
    const f = this.data.publishFrom; const t = this.data.publishTo;
    this.setData({ publishFrom: t, publishTo: f });
  },

  onDateChange(e) { this.setData({ publishDate: e.detail.value }); },
  onEarliestTimeChange(e) { this.setData({ publishEarliestTime: e.detail.value }); },
  onLatestTimeChange(e) { this.setData({ publishLatestTime: e.detail.value }); },

  onSeatChange(e) {
    const total = Math.max(1, Math.min(8, parseInt(e.detail.value) || 4));
    const remain = Math.min(this.data.publishRemainSeats, total);
    this.setData({ publishTotalSeats: total, publishRemainSeats: remain });
  },
  onRemainSeatChange(e) {
    const remain = Math.max(0, Math.min(this.data.publishTotalSeats, parseInt(e.detail.value) || 0));
    this.setData({ publishRemainSeats: remain });
  },
  onSeatIncr() {
    this.setData({ publishTotalSeats: Math.min(8, (this.data.publishTotalSeats || 2) + 1) });
  },
  onSeatDecr() {
    this.setData({ publishTotalSeats: Math.max(1, (this.data.publishTotalSeats || 2) - 1) });
  },

  onContactInput(e) { this.setData({ publishContact: e.detail.value }); },
  onNoteInput(e) { this.setData({ publishNote: e.detail.value }); },

  _buildTagList() {
    const { allTags, publishTags } = this.data;
    const tagList = allTags.map(t => ({ name: t, selected: publishTags.includes(t) }));
    this.setData({ tagList });
  },

  onPublishTagTap(e) {
    const tag = e.currentTarget.dataset.tag;
    const tags = [...this.data.publishTags];
    const idx = tags.indexOf(tag);
    if (idx >= 0) tags.splice(idx, 1);
    else if (tags.length < 5) tags.push(tag);
    this.setData({ publishTags: tags });
    this._buildTagList();
  },

  onAddCustomTag() {
    if (this.data.publishTags.length >= 5) {
      api.showToast('最多选择5个标签');
      return;
    }
    this.setData({ showCustomTagInput: true, publishCustomTag: '' });
  },
  onCustomTagInput(e) { this.setData({ publishCustomTag: e.detail.value }); },
  confirmCustomTag() {
    const v = this.data.publishCustomTag.trim();
    if (!v) return;
    if (this.data.publishTags.length >= 5) { api.showToast('最多5个标签'); return; }
    if (this.data.publishTags.includes(v)) { api.showToast('标签已存在'); return; }
    this.setData({ publishTags: [...this.data.publishTags, v], showCustomTagInput: false, publishCustomTag: '' });
    this._buildTagList();
  },
  cancelCustomTag() { this.setData({ showCustomTagInput: false, publishCustomTag: '' }); },

  async onSubmitPublish() {
    if (!this.data.publishFrom || !this.data.publishTo) {
      api.showToast('请填写出发地和目的地');
      return;
    }
    if (!this.data.publishContact) {
      api.showToast('请填写联系方式（加入后可查看）');
      return;
    }
    api.showLoading('发布中...');

    const data = {
      from: this.data.publishFrom,
      to: this.data.publishTo,
      type: this.data.publishType,
      departureEarliest: this.data.publishDate
        ? new Date(`${this.data.publishDate} ${this.data.publishEarliestTime || '08:00'}`).toISOString()
        : new Date(Date.now() + 86400000).toISOString(),
      departureLatest: (() => {
        if (this.data.publishLatestTime && this.data.publishDate) {
          return new Date(`${this.data.publishDate} ${this.data.publishLatestTime}`).toISOString();
        }
        // 未填最晚出发，默认 = 最早出发 + 30分钟
        if (this.data.publishEarliestTime && this.data.publishDate) {
          const t = new Date(`${this.data.publishDate} ${this.data.publishEarliestTime}`);
          t.setMinutes(t.getMinutes() + 30);
          return t.toISOString();
        }
        return null;
      })(),
      totalSeats: this.data.publishTotalSeats,
      remainSeats: this.data.publishRemainSeats || this.data.publishTotalSeats,
      tags: this.data.publishTags,
      note: this.data.publishNote,
      contact: this.data.publishContact,
    };

    const res = this.data.editMode
      ? await api.updateCarpool(this.data.editId, data)
      : await api.createCarpool(data);

    api.hideLoading();
    if (res.success) {
      api.showToast(this.data.editMode ? '已更新' : '发布成功', 'success');
      this.resetPublishForm();
      this.setData({ currentTab: 0 });
      this.loadHallData();
    } else {
      api.showToast(res.message || '操作失败');
    }
  },

  resetPublishForm() {
    this.setData({
      publishType: 'offer', publishFrom: '{{SCHOOL_NAME}}', publishTo: '',
      publishDate: '', publishEarliestTime: '', publishLatestTime: '', publishTotalSeats: 2, publishRemainSeats: 2,
      publishContact: '', publishNote: '', publishTags: [], showCustomTagInput: false, editId: '', editMode: false,
    });
    this._buildTagList();
  },

  // ============ Tab3: 消息 ============
  async loadMsgData() {
    if (!app.globalData.isLogin) return;
    this.setData({ msgLoading: true });
    const [notifRes, groupRes, onlineRes, announcementRes] = await Promise.all([
      api.getNotifications().catch(() => ({ success: false })),
      api.getMyGroupChats().catch(() => ({ success: false })),
      api.getOnlineUsers().catch(() => ({ success: false })),
      api.getAnnouncements({ page: 1, pageSize: 10 }).catch(() => ({ success: false })),
    ]);

    let onlineUserIds = [];
    if (onlineRes.success && onlineRes.data) {
      const list = Array.isArray(onlineRes.data) ? onlineRes.data : (onlineRes.data.list || []);
      onlineUserIds = list.map(u => u._id || u.userId || u).filter(Boolean);
    }

    let groupChats = [];
    if (groupRes.success) {
      const gList = (groupRes.list || groupRes.data || []);
      // 按最后消息时间降序排列
      gList.sort((a, b) => {
        const ta = a.lastMsgTime ? new Date(a.lastMsgTime).getTime() : 0;
        const tb = b.lastMsgTime ? new Date(b.lastMsgTime).getTime() : 0;
        return tb - ta;
      });
      groupChats = gList.slice(0, 10).map(g => ({
        ...g,
        _dateStr: g.departureTime ? `${new Date(g.departureTime).getMonth()+1}/${new Date(g.departureTime).getDate()}` : '',
        _lastTime: g.lastMsgTime ? api.timeAgo(g.lastMsgTime) : '',
        _lastMsg: g.lastMessage || '',
        _lastSender: g.lastSender || '',
      }));
    }
    const showAllGroups = this.data.showAllGroups;
    const displayGroupChats = showAllGroups ? groupChats : groupChats.slice(0, 3);

    // 通知列表
    const notifs = (notifRes.list || notifRes.data || []).slice(0, 10).map(n => ({
      ...n,
      _timeText: n.createTime ? api.timeAgo(n.createTime) : '',
    }));

    // 公告列表
    let announcements = [];
    if (announcementRes.success) {
      const aList = (announcementRes.list || announcementRes.data || []);
      announcements = aList.slice(0, 10).map(a => ({
        ...a,
        _timeText: a.createdAt || a.createTime ? api.timeAgo(a.createdAt || a.createTime) : '',
      }));
    }

    // 合并公告+通知（最多1个置顶公告保底，其余按时间排序，最多显示3条）
    const getTime = (item) => {
      const t = item.createTime || item.createdAt || item.publishTime || '';
      return t ? new Date(t).getTime() : 0;
    };

    // 取出置顶公告（最多1个）
    const pinnedAnn = announcements.find(a => a.isTop || a.isPinned);
    // 非置顶公告 + 通知，按时间降序
    const rest = [
      ...announcements.filter(a => a !== pinnedAnn).map(a => ({
        ...a,
        _isAnnouncement: true,
        _key: 'ann_' + (a._id || a.id),
        _sortTime: getTime(a),
      })),
      ...notifs.map(n => ({
        ...n,
        _isAnnouncement: false,
        _key: 'notif_' + (n._id || n.id),
        _sortTime: getTime(n),
      })),
    ];
    rest.sort((a, b) => b._sortTime - a._sortTime);

    // 拼接：置顶公告(1个) + 按时间排序的剩余内容
    const allItems = [
      ...(pinnedAnn ? [{
        ...pinnedAnn,
        _isAnnouncement: true,
        _key: 'ann_' + (pinnedAnn._id || pinnedAnn.id),
        _sortTime: Infinity,
      }] : []),
      ...rest,
    ];

    const mergedNotifs = allItems.slice(0, 3).map(item => ({
      _key: item._key,
      _isAnnouncement: item._isAnnouncement,
      _displayText: item._isAnnouncement
        ? (item.title || '系统公告')
        : (item.title || item.content || '系统通知'),
      _timeText: item._timeText,
      ...item,
    }));

    this.setData({
      groupChats, displayGroupChats, totalGroups: groupChats.length,
      notifications: notifs, totalNotifs: notifs.length,
      announcements, totalAnnouncements: announcements.length,
      mergedNotifs: mergedNotifs.slice(0, 3),
      mergedTotal: announcements.length + notifs.length,
      onlineUserIds, notifUnread: notifRes.unread || 0, msgLoading: false,
    });
    this.loadHomeNotices();
  },

  toggleAllGroups() {
    const show = !this.data.showAllGroups;
    this.setData({
      showAllGroups: show,
      displayGroupChats: show ? this.data.groupChats : this.data.groupChats.slice(0, 3),
    });
  },
  toggleAllNotifs() {
    const show = !this.data.showAllNotifs;
    this.setData({
      showAllNotifs: show,
      displayNotifications: show ? this.data.notifications : this.data.notifications.slice(0, 2),
    });
  },
  toggleAllAnnouncements() {
    const show = !this.data.showAllAnnouncements;
    this.setData({
      showAllAnnouncements: show,
      displayAnnouncements: show ? this.data.announcements : this.data.announcements.slice(0, 1),
    });
  },

  async markAllMsgRead() {
    const res = await api.markAllNotificationsRead();
    if (res.success) { api.showToast('已全部标记已读', 'success'); this.setData({ notifUnread: 0 }); }
  },

  goNotifications() {
    wx.navigateTo({ url: '/subpkg/my-list/my-list?type=notifications&title=消息通知' });
  },

  // 点击合并通知内的单条 → 直接跳行程详情
  tapMergedNotif(e) {
    const item = e.currentTarget.dataset.item;
    if (!item) return;
    // 标记已读（仅通知）
    if (!item._isAnnouncement && (item._id || item.id)) {
      api.markNotificationRead(item._id || item.id).catch(() => {});
    }
    const carpoolId = item.relatedCarpool || item.relatedCarpoolId;
    if (carpoolId) {
      wx.navigateTo({ url: '/subpkg/detail/detail?id=' + carpoolId });
    } else if (item._isAnnouncement) {
      // 公告无关联行程 → 跳公告详情
      wx.navigateTo({ url: '/subpkg/announcement-detail/announcement-detail?id=' + (item._id || item.id) });
    }
  },

  goMsgTab() {
    this.setData({ currentTab: 2 });
    if (app.globalData.isLogin) this.loadMsgData();
  },
  async tapNotification(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) {
      wx.navigateTo({ url: '/subpkg/my-list/my-list?type=notifications&title=消息通知' });
      return;
    }
    // 标记已读
    await api.markNotificationRead(id).catch(() => {});
    // 用 id 找到对应通知并更新（不用 index，避免折叠时索引错位）
    const notifs = this.data.notifications.map(n => String(n._id || n.id) === String(id) ? { ...n, isRead: true } : n);
    const disp = this.data.displayNotifications.map(n => String(n._id || n.id) === String(id) ? { ...n, isRead: true } : n);
    const newUnread = notifs.filter(n => !n.isRead).length;
    this.setData({ notifications: notifs, displayNotifications: disp, notifUnread: newUnread });
    wx.navigateTo({ url: '/subpkg/my-list/my-list?type=notifications&title=消息通知' });
  },
  goAnnouncements() {
    wx.navigateTo({ url: '/subpkg/announcement/announcement' });
  },
  goAnnouncementDetail(e) {
    const { id } = e.currentTarget.dataset;
    if (id) wx.navigateTo({ url: '/subpkg/announcement-detail/announcement-detail?id=' + id });
  },
  goGroupChat(e) {
    const { carpoolid } = e.currentTarget.dataset;
    if (!carpoolid) return;
    wx.navigateTo({ url: `/subpkg/group-chat/group-chat?carpoolId=${carpoolid}` });
  },

  // ============ Tab4: 我的 ============
  refreshUserInfo() {
    const userInfo = wx.getStorageSync('userInfo');
    const wasLogin = this.data.isLogin;
    const isLogin = !!(userInfo && app.globalData.isLogin);
    if (userInfo && isLogin) {
      // 确保头像URL是完整路径
      if (userInfo.avatarUrl && userInfo.avatarUrl.startsWith('/')) {
        userInfo.avatarUrl = api.fixUrl(userInfo.avatarUrl);
      }
      this.setData({
        userInfo, isLogin: true, showLoginModal: false,
        stats: { creditScore: userInfo.creditScore || 100, tripCount: userInfo.tripCount || 0, goodRate: userInfo.goodRate || 100 },
      });
      this.buildMenuItems();
      this.buildSafeItems();
      // 登录态刚变化时加载消息
      if (!wasLogin) this.loadMsgData();
    } else {
      this.setData({ userInfo: null, isLogin: false, stats: { creditScore: 100, tripCount: 0, goodRate: 100 } });
    }
  },

  buildMenuItems() {
    this.setData({
      menuItems: [
        { key: 'my_publish', icon: 'publish', label: '我发布的' },
        { key: 'my_joined', icon: 'joined', label: '我参与的' },
        { key: 'my_favorites', icon: 'star', label: '我的收藏' },
        { key: 'my_reviews', icon: 'chat', label: '我的评价' },
        { key: 'notifications', icon: 'bell', label: '消息通知', badge: 0 },
        { key: 'history', icon: 'clock', label: '历史同行' },
      ],
    });
  },

  buildSafeItems() {
    this.setData({
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
    });
  },

  goLogin() { wx.navigateTo({ url: '/subpkg/login/login?from=mine' }); },
  closeLoginModal() { this.setData({ showLoginModal: false }); },
  confirmLogin() { this.setData({ showLoginModal: false }); wx.navigateTo({ url: '/subpkg/login/login?from=mine' }); },

  tapMenu(e) {
    const { key } = e.currentTarget.dataset;
    // 登录拦截已移除（演示模式）
    switch (key) {
      case 'my_publish': wx.navigateTo({ url: '/subpkg/my-list/my-list?type=publish&title=' + encodeURIComponent('我发布的') }); break;
      case 'my_joined': wx.navigateTo({ url: '/subpkg/my-list/my-list?type=joined&title=' + encodeURIComponent('我参与的') }); break;
      case 'my_favorites': wx.navigateTo({ url: '/subpkg/favorites/favorites' }); break;
      case 'my_reviews': wx.navigateTo({ url: '/subpkg/my-list/my-list?type=reviews&title=' + encodeURIComponent('我的评价') }); break;
      case 'notifications': wx.navigateTo({ url: '/subpkg/my-list/my-list?type=notifications&title=' + encodeURIComponent('消息通知') }); break;
      case 'history': wx.navigateTo({ url: '/subpkg/my-list/my-list?type=history&title=' + encodeURIComponent('历史同行') }); break;
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
      case 'contact': wx.navigateTo({ url: '/subpkg/contact/contact' }); break;
      case 'bind_phone': wx.navigateTo({ url: '/subpkg/bind-phone/bind-phone' }); break;
      case 'share_trip': wx.setClipboardData({ data: '我在「同行鸭」上发布了行程，来一起拼车吧！', success: () => api.showToast('已复制分享文案', 'success') }); break;
      case 'safety_tips': this.showSafetyTips(); break;
      case 'about': this.showAbout(); break;
      case 'emergency': this.callEmergency(); break;
      case 'logout': this.doLogout(); break;
    }
  },

  showSafetyTips() {
    wx.showModal({ title: '安全须知', content: '1. 确认同行人身份信息\n2. 将行程分享给亲友\n3. 选择公共场所集合\n4. 保持通讯畅通\n5. 遇到危险及时报警', showCancel: false, confirmText: '我知道了', confirmColor: '#00A693' });
  },

  showAbout() {
    wx.showModal({
      title: '关于同行鸭',
      content: '同行鸭 v1.0.0\n\n一只不想让你孤单回学校的鸭子。\n\n专为{{SCHOOL_NAME}}学子打造的\n校园拼车出行小助手，\n帮你找到同路人，\n一起拼车一起鸭～\n\n开发者：{{BRAND_NAME}}\n©2026 {{BRAND_NAME}} 版权所有',
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#00A693',
      success: function(res) { console.log('showAbout success', res); },
      fail: function(err) { console.error('showAbout fail', err); }
    });
  },

  callEmergency() {
    wx.showModal({ title: '确认报警', content: '将拨打110报警电话，确认继续？', confirmText: '确认报警', confirmColor: '#FF5A5F', cancelText: '取消', success: (r) => { if (r.confirm) wx.makePhoneCall({ phoneNumber: '110' }); } });
  },

  async doLogout() {
    const ok = await api.showConfirm('退出登录', '确认退出登录吗？');
    if (!ok) return;
    api.showLoading('退出中...');
    await api.logout();
    api.hideLoading();
    app.globalData.userInfo = null; app.globalData.isLogin = false;
    app.globalData.token = null;
    // 彻底清除登录状态
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('token');
    wx.removeStorageSync('refreshToken');
    // 清除所有用户相关数据
    this.setData({
      userInfo: null, isLogin: false,
      stats: { creditScore: 100, tripCount: 0, goodRate: 100 },
      groupChats: [], conversations: [], displayGroupChats: [], displayConversations: [],
      announcements: [], displayAnnouncements: [], mergedNotifs: [], mergedTotal: 0,
      myCarpools: [], myJoined: [], currentTab: 0, // 切回大厅
    });
    this.buildMenuItems();
    api.showToast('已退出登录', 'success');
  },

  editProfile() {
    // 登录拦截已移除（演示模式）
    wx.navigateTo({ url: '/subpkg/profile-edit/profile-edit' });
  },

  onTapICP() {
    wx.setClipboardData({
      data: '©2026 {{BRAND_NAME}} 版权所有',
      success: () => api.showToast('备案号已复制'),
    });
  },

  // ============ 通用 ============
  onPullDownRefresh() {
    wx.vibrateShort({ type: 'light' });
    this.onShow();
    wx.stopPullDownRefresh();
  },
});