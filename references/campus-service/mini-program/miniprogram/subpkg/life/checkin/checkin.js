// pages/life/checkin/checkin.js — 校园打卡（本地 demo 数据，待接 API）
const app = getApp();

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 88,
    typeOptions: [
  {
    "key": "view",
    "name": "风景打卡"
  },
  {
    "key": "food",
    "name": "美食打卡"
  },
  {
    "key": "study",
    "name": "学习打卡"
  },
  {
    "key": "hobby",
    "name": "兴趣打卡"
  }
],
    activeType: 'all',

    list: [
  {
    "_id": "c1",
    "title": "夕阳下的图书馆 📚",
    "tags": [
      "学习",
      "风景"
    ],
    "location": "中央图书馆",
    "time": "今天 17:42",
    "desc": "今天看了 4 小时书，抬头看见这抹橙色的光，真的太治愈了。",
    "recommendCount": 88
  },
  {
    "_id": "c2",
    "title": "第三食堂新菜踩点 🍗",
    "tags": [
      "美食"
    ],
    "location": "第三食堂",
    "time": "今天 12:10",
    "desc": "今天上新了椒麻鸡腿饭，味道在线，比黄焖鸡好吃！推荐！",
    "recommendCount": 42
  },
  {
    "_id": "c3",
    "title": "操场夜跑 10 公里 🏃‍♂️",
    "tags": [
      "运动"
    ],
    "location": "北操场",
    "time": "昨晚 21:00",
    "desc": "本月累计 30 公里！操场人多热闹氛围拉满。",
    "recommendCount": 25
  },
  {
    "_id": "c4",
    "title": "艺术楼新展「看见」",
    "tags": [
      "风景",
      "艺术"
    ],
    "location": "艺术楼一层",
    "time": "昨天 15:00",
    "desc": "今天开幕免费看，摄影 + 数字艺术，喜欢拍照的别错过。",
    "recommendCount": 56
  }
],
    loading: false,
    refreshing: false,
    hasMore: false,

    searchText: '',

    showPublish: false,
    publishTitle: '',
    publishType: 'view',
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
