// guide-animals.js — 动物图鉴子页面（带弹窗）
const base = getApp().globalData._sharedBase;
const guideData = require('../guide/guide-data.js');
const api = require('../../utils/api');

Page({
  data: Object.assign({}, base.baseData, {
    moduleName: 'guide-animals', categoryKey: 'animals',
    categoryName: '动物图鉴', categoryIcon: '/images/guide-icons/24.png',
    categoryColor: '#30D158', items: [], loading: true,
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
      const res = await api.getGuideCategoryData('animals').catch(() => null);
      if (res && res.success && res.list && res.list.length > 0) {
        this.setData({ items: res.list, loading: false });
        return;
      }
    } catch (e) {
      console.warn('[guide-animals] API 失败，使用本地数据:', e);
    }
    var items = guideData.getCategoryData('animals');
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
      path: '/pages/index/index?sp=guide-animals_guide-animals',
    };
  },
  onShareTimeline: function () {
    return {
      title: '【' + this.data.categoryName + '图鉴】探索校园的每一处精彩',
      query: 'sp=guide-animals_guide-animals',
    };
  },
});
