// pages/list/list.js — 列表页
const api = require('../../utils/api');

Page({
  data: {
    type: '',
    name: '',
    items: [],
    page: 1,
    pageSize: 20,
    loading: false,
    noMore: false,
  },

  onLoad(options) {
    const { type, name } = options;
    this.setData({ type, name });
    wx.setNavigationBarTitle({ title: name || '列表' });
    this.loadData();
  },

  async loadData() {
    if (this.data.loading || this.data.noMore) return;
    this.setData({ loading: true });

    try {
      const { type, page, pageSize } = this.data;
      // 根据模块类型调用不同 API
      let res;
      switch (type) {
        case 'delivery':
        case 'task':
        case 'lost':
        case 'forum':
        case 'secondhand':
        case 'rental':
        case 'substitute':
        case 'print':
        case 'yellowpage':
        case 'charity':
          // 通用帖子列表
          res = await api.getCarpoolList({ page, pageSize, type }).catch(() => null);
          break;
        default:
          res = await api.getCarpoolList({ page, pageSize }).catch(() => null);
      }

      const list = (res && res.success ? (res.list || res.data || []) : []);
      const items = this.data.items.concat(list);

      this.setData({
        items,
        page: page + 1,
        loading: false,
        noMore: list.length < pageSize,
      });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  onLoadMore() {
    this.loadData();
  },

  onItemTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: '/subpkg/detail/detail?id=' + id });
  },
});
