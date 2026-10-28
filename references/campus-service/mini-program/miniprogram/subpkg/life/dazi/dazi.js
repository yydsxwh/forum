// pages/life/dazi/dazi.js — 校园搭子（本地 demo 数据，待接 API）
const app = getApp();

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 88,
    typeOptions: [
  {
    "key": "meal",
    "name": "干饭搭子"
  },
  {
    "key": "study",
    "name": "学习搭子"
  },
  {
    "key": "sport",
    "name": "运动搭子"
  },
  {
    "key": "movie",
    "name": "观影搭子"
  },
  {
    "key": "other",
    "name": "其他"
  }
],
    activeType: 'all',

    list: [
  {
    "_id": "d1",
    "title": "想找周六一起吃火锅的女生搭子",
    "tags": [
      "干饭",
      "火锅"
    ],
    "gender": "女",
    "location": "南门火锅街",
    "time": "周六 18:00",
    "desc": "本人女生，吃辣，喜欢牛油锅，找个同样爱吃的姐妹一起~",
    "recommendCount": 12
  },
  {
    "_id": "d2",
    "title": "高数线代期中冲刺搭子",
    "tags": [
      "学习",
      "图书馆"
    ],
    "gender": "不限",
    "location": "图书馆 3 楼",
    "time": "本周末 9:00-22:00",
    "desc": "互相监督、互问问题，本人计科大三大佬一枚，速来！",
    "recommendCount": 35
  },
  {
    "_id": "d3",
    "title": "周三晚上羽毛球场缺一人",
    "tags": [
      "运动",
      "羽毛球"
    ],
    "gender": "男",
    "location": "体育馆 2 楼",
    "time": "周三 19:00-21:00",
    "desc": "水平中等，约得上的话长期组队，AA 制。",
    "recommendCount": 8
  },
  {
    "_id": "d4",
    "title": "周末看电影找搭子 🎬",
    "tags": [
      "观影"
    ],
    "gender": "不限",
    "location": "万达影城",
    "time": "周日 14:00",
    "desc": "看《灌篮高手》新片，单人/闺蜜均可，最好自带零食哈哈。",
    "recommendCount": 21
  }
],
    loading: false,
    refreshing: false,
    hasMore: false,

    searchText: '',

    showPublish: false,
    publishTitle: '',
    publishType: 'meal',
    publishDesc: '',
  },

  onLoad() {
    const win = wx.getWindowInfo();
    this.setData({
      statusBarHeight: win.statusBarHeight || 44,
      navBarHeight: (win.statusBarHeight || 44) + 44,
    });
  },

  goBack() { wx.navigateBack(); },

  onTypeChange(e) {
    this.setData({ activeType: e.currentTarget.dataset.key });
  },

  onSearchInput(e) { this.setData({ searchText: e.detail.value }); },

  onSearch() {
    const kw = (this.data.searchText || '').trim();
    if (!kw) return;
    const filtered = this.data.list.filter(it => (it.title + ' ' + (it.desc || '')).includes(kw));
    this.setData({ list: filtered });
  },

  onItemTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.showToast({ title: '详情页即将上线 (id=' + id + ')', icon: 'none' });
  },

  onRecommend(e) {
    wx.showToast({ title: '👍 点赞 +1', icon: 'none' });
  },

  onPullRefresh() {
    this.setData({ refreshing: true });
    setTimeout(() => this.setData({ refreshing: false }), 800);
  },

  onLoadMore() {
    // demo 数据已全部展示
  },

  onOpenPublish() {
    this.setData({ showPublish: true });
  },

  onClosePublish() {
    this.setData({ showPublish: false, publishTitle: '', publishDesc: '' });
  },

  onPublishTitleInput(e) { this.setData({ publishTitle: e.detail.value }); },
  onPublishDescInput(e) { this.setData({ publishDesc: e.detail.value }); },

  onPublishTypeChange(e) {
    this.setData({ publishType: e.currentTarget.dataset.key });
  },

  onSubmitPublish() {
    const { publishTitle, publishDesc } = this.data;
    if (!publishTitle.trim()) return wx.showToast({ title: '请输入标题', icon: 'none' });
    if (!publishDesc.trim()) return wx.showToast({ title: '请输入描述', icon: 'none' });
    // 发布功能预留：接入后端接口后替换下方 toast 为 api.post 调用
    wx.showToast({ title: '发布成功（演示）', icon: 'success' });
    this.onClosePublish();
  },
});
