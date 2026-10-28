// pages/life/exam/exam.js — 期末题库（本地 demo 数据，待接 API）
const app = getApp();

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 88,
    typeOptions: [
  {
    "key": "past",
    "name": "历年真题"
  },
  {
    "key": "note",
    "name": "复习笔记"
  },
  {
    "key": "summary",
    "name": "考点汇总"
  },
  {
    "key": "video",
    "name": "讲解视频"
  }
],
    activeType: 'all',

    list: [
  {
    "_id": "e1",
    "title": "高数（下）2020-2024 历年真题 PDF",
    "tags": [
      "真题",
      "数学"
    ],
    "desc": "扫描版 + 答案 + 详细解析，覆盖 4 年共 8 套。",
    "recommendCount": 156
  },
  {
    "_id": "e2",
    "title": "马原期末 100 道高频选择",
    "tags": [
      "真题",
      "政治"
    ],
    "desc": "整理自近 5 年真题 + 模拟题，命中率 90%+。",
    "recommendCount": 88
  },
  {
    "_id": "e3",
    "title": "「电路分析」老师手抄笔记",
    "tags": [
      "笔记",
      "工科"
    ],
    "desc": "完整覆盖 16 章，含老师课上补充例题。",
    "recommendCount": 47
  },
  {
    "_id": "e4",
    "title": "英语六级听力提分攻略 + 60 段材料",
    "tags": [
      "笔记",
      "英语"
    ],
    "desc": "内含 60 段 BBC / VOA 听力原文 + 详解。",
    "recommendCount": 72
  }
],
    loading: false,
    refreshing: false,
    hasMore: false,

    searchText: '',

    showPublish: false,
    publishTitle: '',
    publishType: 'past',
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
