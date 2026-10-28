// pages/announcement-detail/announcement-detail.js
const app = getApp();
const api = require('../../utils/api');

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 64,
    contentTop: 164,
    id: '',
    detail: null,
    richContent: '',
    loading: true,
    comments: [],
    commentLoading: false,
    commentText: '',
    sendingComment: false,
    myUserId: null,
  },

  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      contentTop: (app.globalData.navBarHeight || 64) + 50,
      id: options.id || '',
      myUserId: (app.globalData.userInfo && app.globalData.userInfo.id) || null,
    });
    this.loadDetail();
    this.loadComments();
  },

  async loadDetail() {
    this.setData({ loading: true });
    const res = await api.getAnnouncementDetail(this.data.id);
    if (res.success) {
      // 将 HTML 内容包裹内联样式，使 rich-text 正确渲染 h3/ul/li/b/p
      const styleTag = '<style>h3{font-size:17px;font-weight:700;margin:12px 0 6px;color:#1C1C1E}ul{padding-left:16px;margin:8px 0}li{margin:6px 0;line-height:1.8}p{margin:6px 0;line-height:1.8}body{font-size:15px;line-height:1.8;color:rgba(28,28,30,.75)}b,strong{font-weight:700;color:#1C1C1E}</style>';
      const richContent = styleTag + (res.content || res.data?.content || '');
      this.setData({
        detail: { ...res, _timeText: api.formatDate(res.createTime) },
        richContent,
        loading: false,
      });
    } else {
      this.setData({ loading: false });
      api.showToast('加载失败');
    }
  },

  async loadComments() {
    this.setData({ commentLoading: true });
    const res = await api.getAnnouncementComments(this.data.id);
    if (res.success) {
      const comments = (res.comments || []).map(c => ({
        ...c,
        createTimeText: api.formatDate(c.createTime),
      }));
      this.setData({ comments });
    }
    this.setData({ commentLoading: false });
  },

  async onLike() {
    const res = await api.likeAnnouncement(this.data.id);
    if (res.success && res.data) {
      this.setData({
        'detail.isLiked': res.data.isLiked,
        'detail.likeCount': res.data.likeCount,
      });
    }
  },

  onCommentInput(e) {
    this.setData({ commentText: e.detail.value });
  },

  async onSendComment() {
    const text = this.data.commentText.trim();
    if (!text) return api.showToast('请输入内容');
    if (text.length > 500) return api.showToast('评论不能超过500字');

    this.setData({ sendingComment: true });
    const res = await api.addAnnouncementComment(this.data.id, text);
    if (res.success) {
      api.showToast('评论成功');
      this.setData({ commentText: '' });
      this.loadComments();
    }
    this.setData({ sendingComment: false });
  },

  onDeleteComment(e) {
    const commentId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除评论',
      content: '确定删除这条评论吗？',
      success: async (res) => {
        if (res.confirm) {
          await api.deleteAnnouncementComment(this.data.id, commentId);
          this.loadComments();
        }
      },
    });
  },

  goBack() { wx.navigateBack(); },
});
