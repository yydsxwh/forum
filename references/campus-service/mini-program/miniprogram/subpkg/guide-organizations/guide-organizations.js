// guide-organizations.js — 社团组织图鉴子页面（带弹窗）
const base = getApp().globalData._sharedBase;
const guideData = require('../guide/guide-data.js');
const api = require('../../utils/api');

Page({
  data: Object.assign({}, base.baseData, {
    moduleName: 'guide-organizations', categoryKey: 'organizations',
    categoryName: '社团组织', categoryIcon: '/images/guide-icons/12.png',
    categoryColor: '#AF52DE', items: [], loading: true,
    showModal: false, selectedItem: {}, selectedIndex: 0,
  }),

  onLoad: function(options) {
    base.baseOnLoad.call(this, options);
    this.loadData();
  },
  onShow: function() {
    if (base.baseOnShow) base.baseOnShow.call(this);
  },

  async loadData() {
    try {
      const res = await api.getGuideCategoryData('organizations').catch(() => null);
      if (res && res.success && res.list && res.list.length > 0) {
        this.setData({ items: res.list, loading: false });
        return;
      }
    } catch (e) {
      console.warn('[guide-organizations] API 失败，使用本地数据:', e);
    }
    var items = guideData.getCategoryData('organizations');
    this.setData({ items: items, loading: false });
  },

  goBack: function() { wx.navigateBack(); },
  goMsg: function() { wx.switchTab({ url: '/pages/message/index' }); },
  loadMineData: function() {},
  loadList: function() { this.setData({ loading: false }); },

  onItemTap: function(e) {
    var index = e.currentTarget.dataset.index;
    var item = this.data.items[index];
    this.setData({ showModal: true, selectedItem: item, selectedIndex: index });
  },
  closeModal: function() { this.setData({ showModal: false }); },
  preventMove: function() { return false; },
  noop: function() {},

  onShareAppMessage: function () {
    return {
      title: '【' + this.data.categoryName + '图鉴】探索校园的每一处精彩',
      path: '/pages/index/index?sp=guide-organizations_guide-organizations',
    };
  },
  onShareTimeline: function () {
    return {
      title: '【' + this.data.categoryName + '图鉴】探索校园的每一处精彩',
      query: 'sp=guide-organizations_guide-organizations',
    };
  },
});
