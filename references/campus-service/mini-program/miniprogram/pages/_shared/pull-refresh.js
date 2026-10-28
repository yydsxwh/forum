// pages/_shared/pull-refresh.js
// 下拉刷新共享行为：震动 + 自动停转
// 用法：在页面的 onPullDownRefresh 里调用 this._handlePullDown(() => this.loadData())
module.exports = {
  _handlePullDown(refreshFn) {
    wx.vibrateShort({ type: 'light' });
    return Promise.resolve(refreshFn()).then(() => {
      wx.stopPullDownRefresh();
    }).catch(() => {
      wx.stopPullDownRefresh();
    });
  },
};
