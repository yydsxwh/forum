// pages/my-feedback/my-feedback.js
const app = getApp();
const api = require('../../utils/api');

Page({
  data: {
    statusBarHeight: 0, navBarHeight: 64, id: '', detail: null, loading: true,
    statusMap: { pending: '待处理', handling: '处理中', resolved: '已解决', closed: '已关闭' },
  },
  onLoad(options) {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight, navBarHeight: app.globalData.navBarHeight, id: options.id || '' });
    this.loadDetail();
  },
  async loadDetail() {
    this.setData({ loading: true });
    const res = await api.getFeedbackDetail(this.data.id);
    if (res.success && res.data) {
      const d = res.data;
      this.setData({ detail: { ...d, _timeText: api.formatDate(d.createTime), _handleTimeText: d.handleTime ? api.formatDate(d.handleTime) : '' }, loading: false });
    } else { this.setData({ loading: false }); api.showToast('加载失败'); }
  },
  async onRate() {
    const res = await new Promise(resolve => {
      wx.showActionSheet({ itemList: ['1星', '2星', '3星', '4星', '5星'], success: r => resolve(r.tapIndex + 1), fail: () => resolve(null) });
    });
    if (!res) return;
    api.showLoading('提交中...');
    const ret = await api.rateFeedback(this.data.id, res);
    api.hideLoading();
    if (ret.success) { api.showToast('已评分', 'success'); this.loadDetail(); }
    else { api.showToast(ret.message || '操作失败'); }
  },
  async onClose() {
    const confirmed = await api.showConfirm('关闭反馈', '关闭后将无法再次操作，确认？');
    if (!confirmed) return;
    const res = await api.closeFeedback(this.data.id);
    if (res.success) { api.showToast('已关闭', 'success'); this.loadDetail(); }
    else { api.showToast(res.message || '操作失败'); }
  },
  goBack() { wx.navigateBack(); },
});
