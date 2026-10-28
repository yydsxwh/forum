// pages/hall/hall.js
const app = getApp();
const api = require('../../utils/api');

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 64,
    // 路线
    from: '{{SCHOOL_NAME}}',
    to: '{{SCHOOL_CITY}}东站',
    // 筛选
    filterTabs: [
      { label: '全部', value: 'all' },
      { label: '我找同行', value: 'find' },
      { label: '我有空位', value: 'offer' },
      { label: '回学校', value: 'back' },
      { label: '出学校', value: 'out' },
      { label: '高铁站', value: 'station' },
      { label: '机场', value: 'airport' },
      { label: '🔥 推荐', value: 'recommend' }
    ],
    activeFilter: 'all',
    // 同行列表
    carpoolList: [],
    // 状态
    loading: false,
    hasMore: true,
    page: 1,
    refreshing: false,
    // 通知红点
    hasNotification: false,
    // 热门路线
    hotRoutes: []
  },

  onLoad() {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight
    });
    this.loadData();
    this.loadHotRoutes();
  },

  async loadHotRoutes() {
    const res = await api.getHotRoutes();
    if (res.success && res.data) {
      this.setData({ hotRoutes: (res.data.list || res.data || []).slice(0, 3) });
    }
  },

  onShow() {
    this.checkNotifications();
    this.startPolling();
  },

  onHide() {
    this.stopPolling();
  },

  onUnload() {
    this.stopPolling();
  },

  // 静默轮询：每10秒拉取首页第一页数据（页面可见时）
  startPolling() {
    this.stopPolling();
    this._pollTimer = setInterval(() => {
      // 仅当用户停在第一页且无筛选切换时静默刷新
      if (this.data.page === 1 && !this.data.loading) {
        this.silentRefresh();
      }
    }, 10000);
  },

  stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  },

  // 静默刷新：只更新数据，不显示 loading
  async silentRefresh() {
    try {
      const res = await api.getCarpoolList({
        filterType: this.data.activeFilter,
        page: 1,
        pageSize: 10
      });
      const newList = res.list || [];
      const formattedList = newList.map(item => ({
        ...item,
        _formattedTime: api.formatTime(item.departureTime),
        _timeAgo: api.timeAgo(item.createTime)
      }));
      this.setData({ carpoolList: formattedList, hasMore: newList.length >= 10 });
    } catch (err) {
      // 静默失败
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    wx.vibrateShort({ type: 'light' });
    this.setData({ page: 1, hasMore: true, carpoolList: [] });
    this.loadData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.loadData();
    }
  },

  // 加载数据
  async loadData() {
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const res = await api.getCarpoolList({
        filterType: this.data.activeFilter,
        page: this.data.page,
        pageSize: 10
      });

      const newList = res.list || [];
      // 格式化时间
      const formattedList = newList.map(item => ({
        ...item,
        _formattedTime: api.formatTime(item.departureTime),
        _timeAgo: api.timeAgo(item.createTime)
      }));

      if (this.data.page === 1) {
        this.setData({ carpoolList: formattedList });
      } else {
        this.setData({
          carpoolList: [...this.data.carpoolList, ...formattedList]
        });
      }

      this.setData({
        hasMore: newList.length >= 10,
        loading: false
      });
    } catch (err) {
      console.error('加载同行列表失败:', err);
      this.setData({ loading: false });
      // 加载失败时使用本地数据
      if (this.data.carpoolList.length === 0) {
        this.setData({ carpoolList: this.getDefaultList() });
      }
    }
  },

  // 默认数据（离线兜底）
  getDefaultList() {
    const now = Date.now();
    return [
      {
        _id: 'local_1',
        from: '{{SCHOOL_NAME}}',
        to: '{{SCHOOL_CITY}}东站',
        departureTime: new Date(now + 3600000 * 2).toISOString(),
        totalSeats: 3,
        remainSeats: 1,
        type: 'find',
        creator: {
          nickName: '小明',
          avatarUrl: '',
          creditScore: 98
        },
        tags: ['安静', '不抽烟'],
        note: '周六下午出发，东门集合',
        _formattedTime: '',
        _timeAgo: ''
      },
      {
        _id: 'local_2',
        from: '{{SCHOOL_CITY}}东站',
        to: '{{SCHOOL_NAME}}',
        departureTime: new Date(now + 3600000 * 5).toISOString(),
        totalSeats: 4,
        remainSeats: 2,
        type: 'offer',
        creator: {
          nickName: '阿杰',
          avatarUrl: '',
          creditScore: 95
        },
        tags: ['聊天', '听歌'],
        note: '高铁站出来可以接，后排2个空位',
        _formattedTime: '',
        _timeAgo: ''
      },
      {
        _id: 'local_3',
        from: '{{SCHOOL_NAME}}',
        to: '{{SCHOOL_CITY}}机场',
        departureTime: new Date(now + 3600000 * 8).toISOString(),
        totalSeats: 2,
        remainSeats: 1,
        type: 'find',
        creator: {
          nickName: '小芳',
          avatarUrl: '',
          creditScore: 100
        },
        tags: ['女生优先', '安静'],
        note: '赶下午航班，找1个同路人',
        _formattedTime: '',
        _timeAgo: ''
      }
    ].map(item => ({
      ...item,
      _formattedTime: api.formatTime(item.departureTime),
      _timeAgo: api.timeAgo(item.createTime)
    }));
  },

  // 检查通知
  async checkNotifications() {
    try {
      const res = await api.getNotifications();
      // 401 时静默跳过（token 刷新失败时会返回 _401 标记）
      if (res && res._401) return;
      this.setData({ hasNotification: (res.unread || 0) > 0 });
    } catch (err) {
      // 静默失败
    }
  },

  // 交换出发地/目的地
  swapRoute() {
    const { from, to } = this.data;
    this.setData({ from: to, to: from });
    this.refreshList();
  },

  // 选择筛选标签
  selectFilter(e) {
    const { value } = e.currentTarget.dataset;
    if (value === this.data.activeFilter) return;
    if (value === 'recommend') {
      wx.navigateTo({ url: '/subpkg/recommend/recommend' });
      return;
    }
    this.setData({ activeFilter: value, page: 1, carpoolList: [], hasMore: true });
    this.loadData();
  },

  // 刷新列表
  refreshList() {
    this.setData({ page: 1, carpoolList: [], hasMore: true });
    this.loadData();
  },

  // 查看详情
  tapDetail(e) {
    const { item } = e.currentTarget.dataset;
    if (!item || !item._id) return;
    const idStr = String(item._id);
    if (!idStr.startsWith('local_')) {
      wx.navigateTo({ url: `/subpkg/detail/detail?id=${idStr}` });
    } else {
      // 本地数据兜底显示
      const tags = (item.tags || []).join('、') || '无';
      const note = item.note || '无';
      wx.showModal({
        title: '同行详情',
        content: `【路线】${item.from} → ${item.to}\n【时间】${item._formattedTime}\n【类型】${item.type === 'offer' ? '我有空位' : '我找同行'}\n【人数】${item.totalSeats}人（还差${item.remainSeats}人）\n【标签】${tags}\n【备注】${note}`,
        showCancel: false, confirmText: '知道了', confirmColor: '#00A693'
      });
    }
  },

  // 立即加入
  async tapJoin(e) {
    const app = getApp();
    const { item } = e.currentTarget.dataset;
    const confirmed = await api.showConfirm('确认加入', `确认加入${item.creator.nickName}的同行吗？`);
    if (!confirmed) return;

    api.showLoading('加入中...');
    try {
      const res = await api.joinCarpool(item._id);
      if (res && res.success) {
        api.showToast('加入成功', 'success');
        this.refreshList();
      } else {
        api.showToast(res.error || '加入失败', 'none');
      }
    } catch (err) {
      api.showToast('操作失败', 'none');
    }
    api.hideLoading();
  },

  // 跳转通知
  goNotifications() {
    const app = getApp();
    wx.navigateTo({ url: `/subpkg/my-list/my-list?type=notifications&title=${encodeURIComponent('消息通知')}` });
  },

  // 热门路线点击
  onHotRoute(e) {
    const { from, to } = e.currentTarget.dataset;
    this.setData({ activeFilter: 'all', from, to, page: 1, carpoolList: [], hasMore: true });
    this.loadData();
  },

  // 选择出发地
  onPickFrom() {
    wx.navigateTo({
      url: '/subpkg/location-picker/location-picker',
      events: {
        selectLocation: data => {
          this.setData({ from: data.name });
          this.refreshList();
        }
      }
    });
  },

  // 选择目的地
  onPickTo() {
    wx.navigateTo({
      url: '/subpkg/location-picker/location-picker',
      events: {
        selectLocation: data => {
          this.setData({ to: data.name });
          this.refreshList();
        }
      }
    });
  },

  // 点击备案号跳转工信部
  onTapICP() {
    wx.setClipboardData({
      data: '©2026 {{BRAND_NAME}} 版权所有',
      success: () => api.showToast('备案号已复制'),
    });
  }
});
