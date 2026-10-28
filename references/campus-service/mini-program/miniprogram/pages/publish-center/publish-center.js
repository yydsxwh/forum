// pages/publish-center/publish-center.js — 发布中心
const app = getApp();

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 88,
    scrollToUpperLocked: false,
    publishTypes: [
      {
        key: 'carpool',
        title: '发布拼车',
        desc: '找人同行，分摊路费',
        color: '#E91E63',
        url: '/subpkg/publish/publish',
      },
{
        key: 'task',
        title: '发布求助',
        desc: '找人帮忙完成任务',
        color: '#4CAF50',
        url: '/subpkg/hall-task/hall-task',
      },
      {
        key: 'secondhand',
        title: '发布二手',
        desc: '买卖闲置物品',
        color: '#2196F3',
        url: '/subpkg/secondhand/secondhand?currentTab=1',
      },
      {
        key: 'lost',
        title: '失物招领',
        desc: '捡到或丢失物品',
        color: '#9C27B0',
        url: '/subpkg/lost/lost?currentTab=1',
      },
      {
        key: 'rental',
        title: '物品求租',
        desc: '求租或出租物品',
        color: '#00BCD4',
        url: '/subpkg/rental/rental?currentTab=1',
      },
{
        key: 'resource',
        title: '分享资料',
        desc: '学习资料共享',
        color: '#607D8B',
        url: '/subpkg/print/print?currentTab=1',
      },
    ],
  },

  onLoad() {
    let statusBarHeight = 44;
    let windowWidth = 375;
    try {
      if (wx.getSystemInfoSync) {
        const sysInfo = wx.getSystemInfoSync();
        windowWidth = sysInfo.windowWidth || 375;
      }
      if (typeof wx.getWindowInfo === 'function') {
        statusBarHeight = wx.getWindowInfo().statusBarHeight || 44;
      }
    } catch (e) {
      // fallback
    }
    // navBarHeight = statusBarHeight + top-bar-inner(88rpx)
    const innerBarHeight = Math.round(88 * windowWidth / 750);
    const navBarHeight = statusBarHeight + innerBarHeight;
    const topBarHeight = Math.round(8 * windowWidth / 750 + statusBarHeight);
    this.setData({ statusBarHeight, navBarHeight, topBarHeight });
  },

  onShow() {
    if (this.getTabBar && this.getTabBar()) this.getTabBar().setActiveTab(1);
  },

  // 滚动到顶部缓冲锁（防止弹性拉伸反复触发）
  onScrollToUpper() {
    if (this.data.scrollToUpperLocked) return;
    this.setData({ scrollToUpperLocked: true });
    clearTimeout(this._upperTimer);
    this._upperTimer = setTimeout(() => {
      this.setData({ scrollToUpperLocked: false });
    }, 300);
  },

  onPublishTap(e) {
    const { key } = e.currentTarget.dataset;
    const item = this.data.publishTypes.find(t => t.key === key);
    if (!item) return;
    wx.navigateTo({ url: item.url });
  },
});
