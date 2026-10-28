// pages/life/goods/goods.js — 校园好物（本地 demo 数据，待接 API）
const app = getApp();

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 88,
    typeOptions: [
  {
    "key": "review",
    "name": "深度测评"
  },
  {
    "key": "recommend",
    "name": "平价推荐"
  },
  {
    "key": "avoid",
    "name": "避雷吐槽"
  },
  {
    "key": "groupbuy",
    "name": "拼团"
  }
],
    activeType: 'all',

    list: [
  {
    "_id": "g1",
    "title": "百元以内降噪耳机红黑榜 🎧",
    "tags": [
      "测评"
    ],
    "desc": "学生党用过的 6 款降噪耳机横评，性价比之王是它。",
    "recommendCount": 92
  },
  {
    "_id": "g2",
    "title": "宿舍神器：可折叠迷你洗衣机",
    "tags": [
      "推荐"
    ],
    "desc": "搬家友好、3 口之家够用，订单截屏附价格对比。",
    "recommendCount": 64
  },
  {
    "_id": "g3",
    "title": "抠门警告：618 这些别买 ⚠️",
    "tags": [
      "避雷"
    ],
    "desc": "往年大促坑过的 5 样东西，今年能避就避。",
    "recommendCount": 38
  },
  {
    "_id": "g4",
    "title": "校门口打印店拼团月卡",
    "tags": [
      "拼团"
    ],
    "desc": "A4 黑白 5 分 / 张，5 人成团，差 2 人。",
    "recommendCount": 12
  }
],
    loading: false,
    refreshing: false,
    hasMore: false,

    searchText: '',

    showPublish: false,
    publishTitle: '',
    publishType: 'review',
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
