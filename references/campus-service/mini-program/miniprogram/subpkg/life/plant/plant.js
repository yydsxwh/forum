// pages/life/plant/plant.js — 校园绿植（本地 demo 数据，待接 API）
const app = getApp();

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 88,
    typeOptions: [
  {
    "key": "adopt",
    "name": "认养"
  },
  {
    "key": "donate",
    "name": "捐赠"
  },
  {
    "key": "trade",
    "name": "交换"
  },
  {
    "key": "question",
    "name": "养护问答"
  }
],
    activeType: 'all',

    list: [
  {
    "_id": "p1",
    "title": "图书馆门口多肉认养",
    "tags": [
      "认养",
      "多肉"
    ],
    "location": "主图书馆门口",
    "time": "今天 9:00",
    "desc": "一大盆虹之玉，已经长得很满，找个爱绿植的伙伴接它回家。",
    "recommendCount": 32
  },
  {
    "_id": "p2",
    "title": "玉树叶子发黄怎么办？",
    "tags": [
      "问答"
    ],
    "location": "不确定",
    "time": "昨天 21:30",
    "desc": "夏季阳光太强？还是有积水？求植植大佬指点！",
    "recommendCount": 8
  },
  {
    "_id": "p3",
    "title": "换盆多余的薄荷可领",
    "tags": [
      "交换",
      "香草"
    ],
    "location": "南操场边",
    "time": "前天 14:00",
    "desc": "扦插繁殖成功一批，根系健康，自带陶盆带走。",
    "recommendCount": 19
  },
  {
    "_id": "p4",
    "title": "校园春日赏花地图 🌸",
    "tags": [
      "风景"
    ],
    "location": "整个校园",
    "time": "本周",
    "desc": "樱花、玉兰、海棠，三条校园赏花路线整理好啦。",
    "recommendCount": 64
  }
],
    loading: false,
    refreshing: false,
    hasMore: false,

    searchText: '',

    showPublish: false,
    publishTitle: '',
    publishType: 'adopt',
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
