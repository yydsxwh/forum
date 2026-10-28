// custom-tab-bar/index.js
Component({
  data: {
    _activeIdx: 0,
    _bubble: -1,
    unreadMsg: 0,
    list: [
      {
        pagePath: '/pages/index/index',
        text: '首页',
        iconPath: '/images/tabbar/home.png',
        selectedIconPath: '/images/tabbar/home-active.png'
      },
      {
        pagePath: '/pages/publish-center/publish-center',
        text: '发布',
        iconPath: '/images/tabbar/publish.png',
        selectedIconPath: '/images/tabbar/publish-active.png'
      },
      {
        pagePath: '/pages/treehole/treehole',
        text: '树洞',
        iconPath: '/images/tabbar/treehole.png',
        selectedIconPath: '/images/tabbar/treehole-active.png'
      },
      {
        pagePath: '/pages/message/index',
        text: '消息',
        iconPath: '/images/tabbar/message.png',
        selectedIconPath: '/images/tabbar/message-active.png'
      },
      {
        pagePath: '/pages/profile/index',
        text: '我的',
        iconPath: '/images/tabbar/profile.png',
        selectedIconPath: '/images/tabbar/profile-active.png'
      }
    ]
  },

  lifetimes: {
    attached() {
      this._curIdx = 0;
    }
  },

  methods: {
    setActiveTab(idx) {
      if (this.data._activeIdx !== idx) {
        this.setData({ _activeIdx: idx, _bubble: -1 });
        setTimeout(() => {
          this.setData({ _bubble: idx });
        }, 16);
      }
    },

    _syncUnread() {
      const app = getApp();
      const count = app.globalData.unreadMsg || 0;
      if (count !== this.data.unreadMsg) {
        this.setData({ unreadMsg: count });
      }
    },

    switchTab(e) {
      const { index, path } = e.currentTarget.dataset;
      const idx = Number(index);
      if (this.data._activeIdx === idx) return;
      // 登录拦截已移除（演示模式）
      wx.vibrateShort({ type: 'light' });
      getApp().globalData._currentTab = idx;
      this.setData({ _activeIdx: idx, _bubble: -1 });
      setTimeout(() => {
        this.setData({ _bubble: idx });
      }, 16);
      wx.switchTab({ url: path });
    },

    updateUnread(count) {
      this.setData({ unreadMsg: count });
    }
  }
});
