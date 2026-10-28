// pages/treehole/treehole.js — 树洞（匿名倾诉）
const api = require('../../utils/api');
const app = getApp();

const ANIMALS = ['🐣','🐱','🐶','🐼','🦊','🐰','🐨','🐸','🦁','🐮','🐷','🐙','🦄','🐳','🦋','🐌','🐝','🐞','🦉','🐧'];
const MAX_IMAGES = 9;
const MAX_IMAGE_BYTES = 300 * 1024;
const MAX_IMAGE_LONG_EDGE = 1080;
const IMAGE_QUALITIES = [80, 65, 50, 35];

function compressImageOnce(src, quality) {
  return new Promise((resolve, reject) => {
    wx.compressImage({
      src,
      quality,
      success: (res) => resolve(res.tempFilePath),
      fail: reject,
    });
  });
}

function getImageInfo(src) {
  return new Promise((resolve, reject) => {
    wx.getImageInfo({
      src,
      success: resolve,
      fail: reject,
    });
  });
}

function resizeImageTo1080P(src) {
  return new Promise((resolve, reject) => {
    getImageInfo(src).then((info) => {
      const { width, height } = info;
      const longEdge = Math.max(width, height);
      if (longEdge <= MAX_IMAGE_LONG_EDGE) {
        resolve(src);
        return;
      }
      const ratio = MAX_IMAGE_LONG_EDGE / longEdge;
      const targetW = Math.round(width * ratio);
      const targetH = Math.round(height * ratio);

      const query = wx.createSelectorQuery();
      query.select('#th-compress-canvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node) {
            resolve(src);
            return;
          }
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          canvas.width = targetW;
          canvas.height = targetH;
          const img = canvas.createImage();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, targetW, targetH);
            wx.canvasToTempFilePath({
              canvas,
              x: 0,
              y: 0,
              width: targetW,
              height: targetH,
              destWidth: targetW,
              destHeight: targetH,
              fileType: 'jpg',
              quality: 0.8,
              success: (r) => resolve(r.tempFilePath),
              fail: () => resolve(src),
            });
          };
          img.onerror = () => resolve(src);
          img.src = src;
        });
    }).catch(reject);
  });
}

function getFileSize(src) {
  return new Promise((resolve) => {
    wx.getFileInfo({
      filePath: src,
      success: (res) => resolve(res.size || 0),
      fail: () => resolve(0),
    });
  });
}

async function compressImage(src) {
  try {
    let cur = await resizeImageTo1080P(src);
    let size = await getFileSize(cur);
    if (size > 0 && size <= MAX_IMAGE_BYTES) {
      return cur;
    }
    for (const q of IMAGE_QUALITIES) {
      cur = await compressImageOnce(cur, q);
      size = await getFileSize(cur);
      if (size > 0 && size <= MAX_IMAGE_BYTES) {
        return cur;
      }
    }
    return cur;
  } catch (e) {
    console.warn('压缩失败，使用原图:', e);
    return src;
  }
}

const CATEGORY_MAP = {
  find: '捞人',
  complain: '吐槽',
  help: '求助',
  share: '分享'
};

Page({
  data: {
    statusBarHeight: 44,
    topBarHeight: 166,   // 250rpx ≈ 125px + 44px statusBar = 169px(约)
    scrollToUpperLocked: false,
    sortType: 'latest',
    filterCategory: 'all',
    posts: [],
    page: 1,
    hasMore: true,
    loading: false,
    refreshing: false,

    showPublish: false,
    publishText: '',
    publishImages: [],
    publishCategory: 'share',
    publishNickName: '',
    publishLocation: '',
    randomNicks: [
      '橘子汽水', '月光泡面', '熬夜冠军', '甜品杀手',
      '花栗鼠', '咸鱼翻身', '信号满格', '奶茶星人',
      '猫猫大厨', '树洞精灵', '微风轻轻', '泡泡薯片',
      '星星点灯', '海边散步', '柠檬慕斯', '云朵面包',
      '蛋黄酥', '薄荷糖', '晚风说', '粉红气泡',
      '汤圆滚滚', '小熊饼干', '盛夏光年', '月亮睡了'
    ],
    posting: false,
    categories: [
      { value: 'all', label: '全部' },
      { value: 'find', label: '捞人' },
      { value: 'complain', label: '吐槽' },
      { value: 'help', label: '求助' },
      { value: 'share', label: '分享' },
    ],

    showComment: false,
    commentPostId: '',
    commentText: '',
    _sendingComment: false,

    fabX: 0,
    fabY: 0,
    fabDragging: false,
    _fabStartX: 0,
    _fabStartY: 0,
    _fabOriginX: 0,
    _fabOriginY: 0,
    _fabMoved: false,
    _fabSizePx: 48,
    _rpxRatio: 2,
    _windowW: 375,
    _windowH: 667,
  },

  onLoad() {
    let win;
    try {
      if (typeof wx.getWindowInfo === 'function') {
        win = wx.getWindowInfo();
      } else {
        win = wx.getSystemInfoSync();
      }
    } catch (e) {
      win = { windowWidth: 375, windowHeight: 667, statusBarHeight: 44 };
    }
    if (!win || !win.windowWidth) {
      win = { windowWidth: 375, windowHeight: 667, statusBarHeight: 44 };
    }
    const rpxRatio = 750 / win.windowWidth;
    const fabSizePx = 48;
    const safeBottomPx = 180;

    const defaultXpx = win.windowWidth - fabSizePx - 24;
    const defaultYpx = win.windowHeight - fabSizePx - safeBottomPx;

    // topBarHeight = 250rpx(原300 - 50收窄)
    const topBarHeight = Math.round(250 * win.windowWidth / 750 + (win.statusBarHeight || 44));

    this.setData({
      statusBarHeight: win.statusBarHeight || 44,
      topBarHeight,
      _windowW: win.windowWidth,
      _windowH: win.windowHeight,
      _rpxRatio: rpxRatio,
      _fabSizePx: fabSizePx,
      fabX: defaultXpx * rpxRatio,
      fabY: defaultYpx * rpxRatio,
    });
    this.loadPosts();
  },

  onShow() {
    if (this.getTabBar && this.getTabBar()) this.getTabBar().setActiveTab(2);
  },

  // 滚动到顶部缓冲锁
  onScrollToUpper() {
    if (this.data.scrollToUpperLocked) return;
    this.setData({ scrollToUpperLocked: true });
    clearTimeout(this._upperTimer);
    this._upperTimer = setTimeout(() => {
      this.setData({ scrollToUpperLocked: false });
    }, 300);
  },

  // ===== 切换排序 =====
  onSwitchSort(e) {
    const type = e.currentTarget.dataset.type;
    if (type === this.data.sortType) return;
    this.setData({
      sortType: type,
      filterCategory: type === 'mine' ? 'all' : this.data.filterCategory,
      page: 1,
      posts: [],
    }, () => this.loadPosts());
  },

  onSwitchFilter(e) {
    const value = e.currentTarget.dataset.value;
    if (value === this.data.filterCategory) return;
    this.setData({ filterCategory: value, page: 1, posts: [] }, () => this.loadPosts());
  },

  async loadPosts() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      const params = {
        page: this.data.page,
        pageSize: 20,
        sort: this.data.sortType === 'mine' ? 'latest' : this.data.sortType,
      };
      if (this.data.filterCategory && this.data.filterCategory !== 'all') {
        params.category = this.data.filterCategory;
      }
      if (this.data.sortType === 'mine') {
        // 切到「我的」前先校验登录；没登录给个明确提示
        const app = getApp();
        if (!app || !app.globalData || !app.globalData.isLogin) {
          wx.showToast({ title: '请先登录', icon: 'none' });
          this.setData({ loading: false, posts: [], totalLabel: '请先登录' });
          return;
        }
        params.mine = 1;
      }

      const res = await api.getTreeholeList(params).catch(() => null);
      // mine 模式下后端可能返回 401，此时 res 可能为 null 或 {success:false}
      if (this.data.sortType === 'mine' && (!res || res.success === false)) {
        const msg = (res && res.message) || '请先登录';
        wx.showToast({ title: msg, icon: 'none' });
        this.setData({ loading: false, posts: [], totalLabel: '请先登录' });
        return;
      }
      const raw = (res && res.list) ? res.list.map(item => this.formatPost(item)) : [];
      const now = new Date();
      raw.forEach(item => {
        const t = item.createTime ? new Date(item.createTime) : now;
        const diff = Math.floor((now - t) / 86400000);
        if (diff <= 0) item._dateLabel = '今天';
        else if (diff === 1) item._dateLabel = '昨天';
        else if (diff < 7) item._dateLabel = diff + ' 天前';
        else item._dateLabel = (t.getMonth() + 1) + '月' + t.getDate() + '日';
      });
      const all = this.data.page === 1 ? raw : this.data.posts.concat(raw);
      const marked = this.markDateDividers(all.slice());
      let totalLabel = '';
      if (marked.length > 0) {
        if (this.data.sortType === 'mine') {
          totalLabel = '我发过 ' + marked.length + ' 条';
        } else {
          totalLabel = marked.length + ' 颗心跳';
        }
      }
      this.setData({
        posts: marked,
        hasMore: raw.length >= 20,
        loading: false,
        totalLabel,
      });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  formatPost(item) {
    return {
      ...item,
      avatar: item.avatar || ANIMALS[Math.floor(Math.random() * ANIMALS.length)],
      categoryName: CATEGORY_MAP[item.category] || '分享',
      timeText: item.createTime ? api.timeAgo(item.createTime) : '刚刚',
      images: item.images || [],
      comments: item.comments || 0,
      likes: item.likes || 0,
      liked: item.liked || false,
      nickName: item.nickName || ('匿名' + ANIMALS[Math.floor(Math.random() * ANIMALS.length)]),
      location: item.location || '',
      // 兜底：如果后端没传 isMine，按 userId 自行判断
      isMine: item.isMine === true,
    };
  },

  markDateDividers(list) {
    if (!list || list.length === 0) return list;
    let lastLabel = null;
    return list.map((item, idx) => {
      if (idx === 0) {
        item._showDate = true;
        item._dateLabel = item._dateLabel || '今天';
        lastLabel = item._dateLabel;
        return item;
      }
      const cur = item._dateLabel || '今天';
      if (cur !== lastLabel) {
        item._showDate = true;
        lastLabel = cur;
      } else {
        item._showDate = false;
      }
      return item;
    });
  },

  onLoadMore() {
    if (!this.data.hasMore || this.data.loading) return;
    this.setData({ page: this.data.page + 1 }, () => this.loadPosts());
  },

  async onPullRefresh() {
    this.setData({ refreshing: true, page: 1 });
    try { await this.loadPosts(); } finally { this.setData({ refreshing: false }); }
  },

  onCopySuggestion(e) {
    const text = e.currentTarget.dataset.text;
    this.setData({ publishText: text, showPublish: true });
  },

  onOpenPublish() {
      this.setData({
        showPublish: true,
        publishText: '',
        publishImages: [],
        publishCategory: 'share',
        publishNickName: '',
        publishLocation: '',
      });
  },
  onClosePublish() {
    if (this.data.posting) return;
    this.setData({ showPublish: false });
  },
  onPublishInput(e) {
    this.setData({ publishText: e.detail.value });
  },

  onNickNameInput(e) {
    this.setData({ publishNickName: e.detail.value });
  },

  onLocationInput(e) {
    this.setData({ publishLocation: e.detail.value });
  },

  onRandomNick() {
    const { randomNicks } = this.data;
    const picked = randomNicks[Math.floor(Math.random() * randomNicks.length)];
    this.setData({ publishNickName: picked });
  },

  onChooseImage() {
    const remain = MAX_IMAGES - this.data.publishImages.length;
    if (remain <= 0) {
      wx.showToast({ title: `最多 ${MAX_IMAGES} 张`, icon: 'none' });
      return;
    }
    wx.chooseImage({
      count: remain,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const originalPaths = res.tempFilePaths;
        wx.showLoading({ title: '压缩图片中...', mask: true });
        try {
          const compressed = await Promise.all(
            originalPaths.map(p => compressImage(p))
          );
          wx.hideLoading();
          const combined = this.data.publishImages.concat(compressed).slice(0, MAX_IMAGES);
          this.setData({ publishImages: combined });
        } catch (e) {
          wx.hideLoading();
          console.warn('压缩流程异常:', e);
          const combined = this.data.publishImages.concat(originalPaths).slice(0, MAX_IMAGES);
          this.setData({ publishImages: combined });
        }
      }
    });
  },
  onDeleteImage(e) {
    const idx = e.currentTarget.dataset.index;
    const arr = [...this.data.publishImages];
    arr.splice(idx, 1);
    this.setData({ publishImages: arr });
  },

  onSelectCategory(e) {
    this.setData({ publishCategory: e.currentTarget.dataset.value });
  },

  async onSubmitPublish() {
    const text = (this.data.publishText || '').trim();
    if (!text) {
      wx.showToast({ title: '请输入内容', icon: 'none' });
      return;
    }
    this.setData({ posting: true });
    try {
      let imageUrls = [];
      if (this.data.publishImages.length > 0) {
        const upRes = await api.uploadImages(this.data.publishImages).catch(() => null);
        if (upRes && upRes.data && Array.isArray(upRes.data.urls)) {
          imageUrls = upRes.data.urls;
        } else if (upRes && Array.isArray(upRes.urls)) {
          imageUrls = upRes.urls;
        }
      }

      const res = await api.createTreeholePost({
        content: text,
        images: imageUrls,
        category: this.data.publishCategory,
        nickName: this.data.publishNickName,
        location: this.data.publishLocation,
        avatar: ANIMALS[Math.floor(Math.random() * ANIMALS.length)],
      }).catch(() => null);

      if (res && res.success) {
        wx.showToast({ title: '已投递', icon: 'success' });
        this.setData({
          showPublish: false,
          publishText: '',
          publishImages: [],
          publishNickName: '',
          publishLocation: '',
          page: 1,
          posts: [],
        }, () => this.loadPosts());
      } else {
        wx.showToast({ title: '投递失败，重试一下', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: '网络错误', icon: 'none' });
    } finally {
      this.setData({ posting: false });
    }
  },

  async onLike(e) {
    const { id, index } = e.currentTarget.dataset;
    const post = this.data.posts[index];
    if (!post) return;
    const liked = !post.liked;
    const key = 'posts[' + index + ']';
    const delta = liked ? 1 : -1;
    this.setData({
      [key + '.liked']: liked,
      [key + '.likes']: (post.likes || 0) + delta,
    });
    try {
      await api.toggleTreeholeLike(id, liked).catch(() => {});
    } catch (e) { /* 静默 */ }
  },

  onComment(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({ showComment: true, commentPostId: id, commentText: '', commentList: [], commentTotal: 0 });
    this.loadComments(id);
  },
  async loadComments(postId) {
    try {
      const res = await api.getTreeholeComments(postId, { page: 1, pageSize: 30 }).catch(() => null);
      if (res && (res.list || res.total !== undefined)) {
        const app = getApp();
        const currentUserId = app && app.globalData && app.globalData.userInfo ? app.globalData.userInfo._id : null;
        const list = (res.list || []).map(c => {
          c.isMine = currentUserId != null && Number(c.userId) === Number(currentUserId);
          // 修复旧数据：之前所有人都存成了"我"，非本人时显示用户编码
          if (!c.isMine && c.nickName === '我') {
            c.nickName = c.userIdCode ? '树友#' + String(c.userIdCode).slice(-4) : '匿名用户';
          }
          return c;
        });
        this.setData({
          commentList: list,
          commentTotal: res.total || 0,
        });
      }
    } catch (e) { /* 静默 */ }
  },
  onCloseComment() {
    this.setData({ showComment: false, commentText: '' });
  },
  onCommentInput(e) {
    this.setData({ commentText: e.detail.value });
  },
  async onSubmitComment() {
    const text = (this.data.commentText || '').trim();
    if (!text) {
      wx.showToast({ title: '请输入评论', icon: 'none' });
      return;
    }
    if (this.data._sendingComment) return;
    this.setData({ _sendingComment: true });
    try {
      // 不再发送 nickName/avatar，由后端根据 userId 生成唯一匿名身份
      const res = await api.createTreeholeComment(this.data.commentPostId, {
        content: text,
      });
      if (res && res.success !== false) {
        wx.showToast({ title: '已提交，审核通过后显示', icon: 'success', duration: 2500 });
        // 审核模式：不本地增加计数、不插入列表（审核通过后才可见）
        this.setData({ commentText: '', _sendingComment: false });
      } else {
        wx.showToast({ title: (res && res.message) || '评论失败', icon: 'none' });
        this.setData({ _sendingComment: false });
      }
    } catch (e) {
      console.error('评论发送异常:', e);
      wx.showToast({ title: '评论失败', icon: 'none' });
      this.setData({ _sendingComment: false });
    }
  },

  async onDeleteComment(e) {
    const commentId = e.currentTarget.dataset.id;
    const confirmed = await api.showConfirm('删除评论', '确定删除这条评论吗？');
    if (!confirmed) return;
    const res = await api.deleteTreeholeComment(this.data.commentPostId, commentId);
    if (res && res.success) {
      const list = this.data.commentList.filter(c => c.id !== commentId);
      this.setData({ commentList: list, commentTotal: Math.max(0, (this.data.commentTotal || 1) - 1) });
      wx.showToast({ title: '已删除', icon: 'success' });
    } else {
      wx.showToast({ title: (res && res.message) || '删除失败', icon: 'none' });
    }
  },

  onDeletePost(e) {
    const { id, index } = e.currentTarget.dataset;
    const post = this.data.posts[index];
    if (!post) return;
    // 前端兜底：只有作者本人才能删自己的
    if (!post.isMine) {
      wx.showToast({ title: '只能删除自己的心事', icon: 'none' });
      return;
    }
    const self = this;
    wx.showModal({
      title: '删除这条心事？',
      content: '删除后无法恢复，其他人也看不到了',
      confirmText: '删除',
      cancelText: '再想想',
      confirmColor: '#FF4757',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          wx.showLoading({ title: '删除中...', mask: true });
          const resp = await api.deleteTreeholePost(id).catch(() => null);
          wx.hideLoading();
          if (resp && resp.success !== false) {
            wx.showToast({ title: '已删除', icon: 'success' });
            const newList = [...self.data.posts];
            newList.splice(index, 1);
            self.setData({ posts: newList });
          } else {
            wx.showToast({ title: (resp && resp.message) || '删除失败', icon: 'none' });
          }
        } catch (e) {
          wx.hideLoading();
          wx.showToast({ title: '网络错误', icon: 'none' });
        }
      }
    });
  },

  async onShare(e) {
    const { id } = e.currentTarget.dataset;
    const idx = this.data.posts.findIndex(p => p._id === id);
    if (idx < 0) return;
    const key = 'posts[' + idx + ']';
    this.setData({ [key + '.shares']: (this.data.posts[idx].shares || 0) + 1 });
    try {
      const res = await api.shareTreeholePost(id).catch(() => null);
      if (res && res.success) {
        this.setData({ [key + '.shares']: res.shares });
      }
    } catch (e) { /* 静默 */ }
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },

  onShareAppMessage(e) {
    if (e && e.from === 'button' && e.target && e.target.dataset && e.target.dataset.id) {
      const post = this.data.posts.find(p => p._id === e.target.dataset.id);
      if (post) {
        return {
          title: (post.nickName || '匿名朋友') + ' 在树洞说：' + (post.content || '').slice(0, 40),
          path: '/pages/treehole/treehole?id=' + post._id,
        };
      }
    }
    return {
      title: '同行鸭 · 树洞 — 匿名倾诉你的心事',
      path: '/pages/treehole/treehole',
    };
  },

  onPreviewImage(e) {
    const { url } = e.currentTarget.dataset;
    wx.previewImage({ urls: [url], current: url });
  },

  // ===== FAB 拖动 =====
  onFabTap() {
    if (this.data._fabMoved) {
      this.setData({ _fabMoved: false });
      return;
    }
    this.onOpenPublish();
  },

  onFabStart(e) {
    const t = e.touches[0];
    this.setData({
      fabDragging: true,
      _fabStartX: t.clientX,
      _fabStartY: t.clientY,
      _fabOriginX: this.data.fabX,
      _fabOriginY: this.data.fabY,
      _fabMoved: false,
    });
  },

  onFabMove(e) {
    const t = e.touches[0];
    const dx = t.clientX - this.data._fabStartX;
    const dy = t.clientY - this.data._fabStartY;

    if (!this.data._fabMoved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      this.setData({ _fabMoved: true });
    }
    if (!this.data._fabMoved) return;

    const rpxRatio = this.data._rpxRatio;
    const newXpx = this.data._fabOriginX / rpxRatio + dx;
    const newYpx = this.data._fabOriginY / rpxRatio + dy;

    const fabSize = this.data._fabSizePx;
    const minXpx = 0;
    const maxXpx = this.data._windowW - fabSize;
    const minYpx = 0;
    const maxYpx = this.data._windowH - fabSize;

    const clampedXpx = Math.max(minXpx, Math.min(maxXpx, newXpx));
    const clampedYpx = Math.max(minYpx, Math.min(maxYpx, newYpx));

    this.setData({
      fabX: clampedXpx * rpxRatio,
      fabY: clampedYpx * rpxRatio,
    });
  },

  onFabEnd() {
    if (!this.data._fabMoved) {
      this.setData({ fabDragging: false });
      return;
    }
    const rpxRatio = this.data._rpxRatio;
    const fabSize = this.data._fabSizePx;
    const midPx = this.data._windowW / 2;
    const curXpx = this.data.fabX / rpxRatio;
    let snapXpx;
    if (curXpx + fabSize / 2 < midPx) {
      snapXpx = 12;
    } else {
      snapXpx = this.data._windowW - fabSize - 12;
    }
    this.setData({
      fabX: snapXpx * rpxRatio,
      fabDragging: false,
    });
    setTimeout(() => {
      this.setData({ _fabMoved: false });
    }, 250);
  },
});
