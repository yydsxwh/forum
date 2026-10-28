// pages/food/food.js — 食堂推荐 (tab 版)
const app = getApp();
const api = require('../../utils/api');

// 评分等级配置：夯(5) → 拉完了(1)
// icon: 对应 .svg-ico-* 类名，由 wxml <view class="svg-ico {{icon}}"> 渲染
const RATING_LEVELS = [
  { score: 5, label: '夯',      icon: 'svg-ico-fire',    color: '#FF3B30', bg: '#FFF0F0' },
  { score: 4, label: '顶级',    icon: 'svg-ico-diamond', color: '#FF9500', bg: '#FFF3E0' },
  { score: 3, label: '人上人',  icon: 'svg-ico-cool',    color: '#007AFF', bg: '#F0F7FF' },
  { score: 2, label: 'NPC',     icon: 'svg-ico-meh',     color: '#8E8E93', bg: '#F5F5F5' },
  { score: 1, label: '拉完了',  icon: 'svg-ico-poop',    color: '#636366', bg: '#F0F0F0' },
];

Page({
  data: {
    statusBarHeight: 44,
    foodScrollTop: 0,

    // ===== Tab 系统 =====
    currentTab: 0,

    // 食堂筛选
    canteens: [
      { key: 'all',   name: '全部食堂' },
      { key: '1', name: '第一食堂' },
      { key: '2', name: '第二食堂' },
      { key: '3', name: '第三食堂' },
    ],
    activeCanteen: 'all',

    // 分类筛选
    categories: [
      { key: 'all',      name: '全部' },
      { key: 'rice',     name: '米饭煲类' },
      { key: 'noodle',   name: '馄饨粉面' },
      { key: 'bread',    name: '面点粥饼' },
      { key: 'malatang', name: '麻辣烫锅' },
      { key: 'buffet',   name: '自选快餐' },
      { key: 'snack',    name: '小吃饮品' },
    ],
    activeCategory: 'all',

    // 列表数据
    foodList: [],
    foodGridVisible: true,
    scrollIntoView: '',
    loading: false,
    refreshing: false,
    error: null,

    // 搜索
    searchText: '',

    // 抽签
    drawing: false,
    drawResult: null,
    filteredPoolLength: 0,

    // 不吃列表（localStorage）
    excludeList: [],
    _excludeIds: {},
    // 不吃清单弹窗
    showExcludeSheet: false,

    // 我的评分弹窗
    showMyRatingsSheet: false,
    myRatingsLoading: false,
    myRatingsList: [],
    myRatingsCount: 0,

    // 我的收藏弹窗
    showMyFavoritesSheet: false,
    myFavoritesLoading: false,
    myFavoritesList: [],
    myFavoritesCount: 0,

    // 我的 tab
    userInfo: {},
    stats: { posts: 0, favorites: 0, reviews: 0 },

    // ===== 档口详情弹窗 =====
    showDetailSheet: false,
    detailLoading: false,
    detailStall: null,
    detailImages: [],       // [{url}] 轮播图
    detailRatingDist: [0, 0, 0, 0, 0],  // 1-5 星各多少人
    detailAvgRating: 0,
    detailReviews: [],
    // 详情内写评价
    detailReviewScore: 0,
    detailReviewImages: [],
    detailReviewText: '',
    detailReviewSubmitting: false,
    detailMenu: [],
    detailImageCount: 0,
    detailImageLayout: 'grid-1',
    detailImageOverflow: 0,

    // ===== 评分弹窗 =====
    showRateModal: false,
    rateStallId: '',
    rateStallName: '',
    rateScore: 0,           // 选中的分值 1-5
    rateImages: [],         // 已选图片临时路径
    rateComment: '',
    rateSubmitting: false,
    ratingLevels: RATING_LEVELS,
  },

  onLoad() {
    const win = wx.getWindowInfo();
    this.setData({ statusBarHeight: win.statusBarHeight || 44 });
    this._loadExcludeList();
    this.loadFoodList(true);
  },

  onShow() {
    const user = wx.getStorageSync('userInfo') || {};
    if (user.nickName) this.setData({ userInfo: user });
    this._loadExcludeList();
    this._updatePoolLength();
    // 如果在「我的」tab，预加载数量
    if (this.data.currentTab === 2) {
      this._loadMyRatings();
      this._loadMyFavorites();
    }
  },

  // ===== Tab 切换 =====
  switchTab(e) {
    wx.vibrateShort({ type: 'light' });
    const idx = parseInt(e.currentTarget.dataset.index);
    this.setData({ currentTab: idx });
  },
  onSwiperChange(e) {
    this.setData({ currentTab: e.detail.current });
  },

  // ===== 大厅 Tab =====
  async loadFoodList(reset) {
    if (this.data.loading && !reset) return;
    this.setData({ loading: true, error: null });
    try {
      const params = {};
      if (this.data.activeCanteen !== 'all') params.canteen = this.data.activeCanteen;
      if (this.data.activeCategory !== 'all') params.category = this.data.activeCategory;
      if (this.data.searchText.trim()) params.keyword = this.data.searchText.trim();
      const res = await api.getFoodRecommendations(params);
      const list = (res.list || []).map(item => this._formatFoodItem(item));
      const nextList = reset ? this._sortFoodList(list) : this._sortFoodList(this.data.foodList.concat(list));
      if (reset) {
        this.setData({
          foodList: nextList,
          loading: false,
          refreshing: false,
        }, () => {
          this._updatePoolLength();
        });
      } else {
        this.setData({
          foodList: nextList,
          loading: false,
        }, () => { this._updatePoolLength(); });
      }
    } catch (e) {
      console.warn('[food] loadFoodList error:', e);
      this.setData({ loading: false, refreshing: false, error: e.message || '加载失败' });
    }
  },

  onPullRefresh() {
    this.setData({ refreshing: true });
    this.loadFoodList(true);
  },
  onLoadMore() {
    if (!this.data.loading) this.loadFoodList();
  },
  onSearchInput(e) { this.setData({ searchText: e.detail.value }); },
  onSearch() { this.loadFoodList(true); },

  onCanteenChange(e) {
    this.setData({ activeCanteen: e.currentTarget.dataset.key, drawResult: null }, () => {
      this.loadFoodList(true);
    });
  },
  onCategoryChange(e) {
    this.setData({ activeCategory: e.currentTarget.dataset.key, drawResult: null }, () => {
      this.loadFoodList(true);
    });
  },

  // ===== 档口详情弹窗 =====
  async onFoodTap(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.foodList.find(i => i._id === id);
    if (!item) return;
    const rawImgs = (item.images && item.images.length > 0)
      ? item.images.map(u => ({ url: u }))
      : item.cover_image ? [{ url: item.cover_image }] : [];
    const imgCount = Math.min(rawImgs.length, 9);
    this.setData({
      showDetailSheet: true,
      detailLoading: true,
      detailStall: item,
      detailImages: rawImgs.slice(0, 9),
      detailImageCount: imgCount,
      detailImageLayout: this._getImageLayoutClass(imgCount),
      detailImageOverflow: rawImgs.length > 9 ? rawImgs.length - 9 : 0,
      detailRatingDist: [0, 0, 0, 0, 0],
      detailAvgRating: Number(item.rating) || 0,
      detailReviews: [],
      detailMenu: [],
      detailReviewScore: 0,
      detailReviewImages: [],
      detailReviewText: '',
    });
    // 拉详情 + 菜单
    try {
      const [res, menuRes] = await Promise.all([
        api.getStallDetail(id),
        api.getStallMenu(id),
      ]);
      if (res && res.data) {
        const d = res.data;
        const imgs = (d.images && d.images.length > 0)
          ? d.images.map(u => ({ url: u.startsWith('http') ? u : (api.API_BASE || 'https://{{DOMAIN}}') + u }))
          : [];
        const finalImgs = imgs.length > 0 ? imgs : (item.cover_image ? [{ url: item.cover_image }] : []);
        const slicedImgs = finalImgs.slice(0, 9);
        const totalCount = finalImgs.length;
        const dist = d.ratingDistribution || [0, 0, 0, 0, 0];
        const reviews = (d.reviews || []).map(r => ({
          ...r,
          avatarUrl: r.avatarUrl || '',
          _timeLabel: r.createTime ? api.timeAgo(r.createTime) : '',
        }));
        this.setData({
          detailLoading: false,
          detailStall: { ...item, ...d, _id: item._id },
          detailImages: slicedImgs,
          detailImageCount: Math.min(totalCount, 9),
          detailImageLayout: this._getImageLayoutClass(Math.min(totalCount, 9)),
          detailImageOverflow: totalCount > 9 ? totalCount - 9 : 0,
          detailRatingDist: dist,
          detailAvgRating: Number(d.rating || item.rating) || 0,
          detailReviews: reviews,
        });
      } else {
        this.setData({ detailLoading: false });
      }
      // 菜单
      if (menuRes && menuRes.data && Array.isArray(menuRes.data)) {
        this.setData({ detailMenu: menuRes.data });
      }
    } catch (err) {
      this.setData({ detailLoading: false });
    }
  },

  closeDetail() {
    this.setData({ showDetailSheet: false });
  },

  // 详情内：选评分等级
  selectDetailScore(e) {
    this.setData({ detailReviewScore: parseInt(e.currentTarget.dataset.score) });
  },

  // 详情内：选图片
  async chooseDetailImage() {
    const { detailReviewImages } = this.data;
    if (detailReviewImages.length >= 9) return;
    const remaining = 9 - detailReviewImages.length;
    const res = await new Promise((resolve) => {
      wx.chooseImage({
        count: remaining,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: resolve,
        fail: () => resolve({ tempFilePaths: [] }),
      });
    });
    const newImgs = (res.tempFilePaths || []).map(p => ({ url: p, isRemote: false }));
    this.setData({ detailReviewImages: [...detailReviewImages, ...newImgs] });
  },

  removeDetailImage(e) {
    const idx = e.currentTarget.dataset.idx;
    const imgs = [...this.data.detailReviewImages];
    imgs.splice(idx, 1);
    this.setData({ detailReviewImages: imgs });
  },

  onDetailReviewInput(e) {
    this.setData({ detailReviewText: e.detail.value });
  },

  // 提交评价
  async submitDetailReview() {
    const { detailStall, detailReviewScore, detailReviewImages, detailReviewText, detailReviewSubmitting } = this.data;
    if (detailReviewSubmitting) return;
    if (!detailReviewScore) {
      wx.showToast({ title: '请先选一个评分', icon: 'none' });
      return;
    }
    this.setData({ detailReviewSubmitting: true });
    wx.showLoading({ title: '提交中...' });
    try {
      const uploadedUrls = [];
      for (const img of detailReviewImages) {
        if (img.isRemote) {
          uploadedUrls.push(img.url);
        } else {
          const upRes = await api.uploadImage(img.url);
          if (upRes && upRes.success && upRes.data && upRes.data.url) {
            uploadedUrls.push(api.fixUrl(upRes.data.url));
          }
        }
      }
      const res = await api.submitStallReview(
        String(detailStall._id),
        detailReviewScore,
        detailReviewText.trim(),
        uploadedUrls.length > 0 ? uploadedUrls : null,
      );
      wx.hideLoading();
      if (res && res.success) {
        wx.showToast({ title: '评价成功！', icon: 'success' });
        this.setData({
          detailReviewScore: 0,
          detailReviewImages: [],
          detailReviewText: '',
          detailReviewSubmitting: false,
        });
        // 刷新详情
        this.onFoodTap({ currentTarget: { dataset: { id: detailStall._id } } });
        // 同步列表
        this.loadFoodList(true);
      } else {
        this.setData({ detailReviewSubmitting: false });
        wx.showToast({ title: (res && res.message) || '提交失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      this.setData({ detailReviewSubmitting: false });
      wx.showToast({ title: '网络错误', icon: 'none' });
    }
  },

  async onRecommend(e) {
    const { id } = e.currentTarget.dataset;
    const oldItem = this.data.foodList.find(i => i._id === id);
    if (!oldItem) return;
    const list = this.data.foodList.map(item => {
      if (item._id === id) {
        const hasRecommended = item._recommended;
        return { ...item, _recommended: !hasRecommended, recommendCount: (item.recommendCount || 0) + (hasRecommended ? -1 : 1) };
      }
      return item;
    });
    this.setData({ foodList: list });
    try {
      await api.recommendFood(id);
    } catch (err) {
      this.setData({ foodList: this.data.foodList.map(item => item._id === id ? oldItem : item) });
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  _formatFoodItem(item) {
    const r = Number(item.rating) || 0;
    return {
      ...item,
      _id: item.id || item._id,
      name: item.name || item.title || '',
      cover_image: item.cover_image || item.cover || item.image || '',
      _hasCover: !!(item.cover_image || item.cover || item.image),
      price_range: item.price_range || '',
      location_desc: item.location_desc || item.location || '',
      canteenName: item.canteenName || item.location_desc || '',
      categoryName: item.categoryName || item.category || '',
      rating: item.rating != null ? Number(item.rating).toFixed(1) : '0.0',
      rating_count: item.rating_count || item.ratingCount || 0,
      _ratingLevel: this._calcRatingLevel(r),
      _ratingStars: this._calcStars(r),
      recommend_count: item.recommend_count || item.recommendCount || 0,
    };
  },

  // 列表排序：有图在前 → 评分高在前 → 没图没评分的沉最底
  _sortFoodList(list) {
    return [...list].sort((a, b) => {
      const aHasCover = !!a._hasCover;
      const bHasCover = !!b._hasCover;
      const aRating = Number(a.rating) || 0;
      const bRating = Number(b.rating) || 0;
      const aBare = !aHasCover && aRating <= 0;
      const bBare = !bHasCover && bRating <= 0;
      // 没图没评分 → 沉最底
      if (aBare !== bBare) return aBare ? 1 : -1;
      // 有图在前
      if (aHasCover !== bHasCover) return aHasCover ? -1 : 1;
      // 评分高在前
      if (aRating !== bRating) return bRating - aRating;
      return 0;
    });
  },

  // 5 级评分：夯(5) → 顶级(4) → 人上人(3) → NPC(2) → 拉完了(1)
  _calcRatingLevel(rating) {
    if (!rating || rating <= 0) return '暂无等级';
    if (rating >= 4.5) return '夯';
    if (rating >= 3.5) return '顶级';
    if (rating >= 2.5) return '人上人';
    if (rating >= 1.5) return 'NPC';
    return '拉完了';
  },

  _calcStars(rating) {
    const r = Number(rating) || 0;
    const full = Math.round(r);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  },

  // 图片拼图布局：根据图片数量返回对应的 CSS 类名
  _getImageLayoutClass(count) {
    if (count <= 0) return 'grid-0';
    if (count === 1) return 'grid-1';
    if (count === 2) return 'grid-2';
    if (count === 3) return 'grid-3';
    if (count === 4) return 'grid-4';
    if (count === 5) return 'grid-5';
    if (count === 6) return 'grid-6';
    if (count === 7) return 'grid-7';
    if (count === 8) return 'grid-8';
    return 'grid-9';
  },

  // ===== 评分弹窗 =====
  async openRateModal(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    if (e && e.preventDefault) e.preventDefault();
    const id = e.currentTarget.dataset.id;
    const item = this.data.foodList.find(i => i._id === id);
    if (!item) return;

    // 检查登录
    this.setData({
      showRateModal: true,
      rateStallId: String(id),
      rateStallName: item.name || item.title || '',
      rateScore: 0,
      rateImages: [],
      rateComment: '',
    });

    // 拉用户已有评价，回填
    try {
      const res = await api.getMyStallReview(String(id));
      if (res && res.data) {
        const d = res.data;
        const score = Number(d.rating) || 0;
        // 把 1-5 分转成对应的 level
        const level = RATING_LEVELS.find(l => l.score === score);
        this.setData({
          rateScore: score,
          rateComment: d.content || '',
          rateImages: (d.images && Array.isArray(d.images) ? d.images : []).map(url => ({ url, isRemote: true })),
        });
      }
    } catch (err) {
      // 没有历史评价则忽略
    }
  },

  closeRateModal() {
    this.setData({ showRateModal: false, rateSubmitting: false });
  },

  selectRatingLevel(e) {
    const score = parseInt(e.currentTarget.dataset.score);
    this.setData({ rateScore: score });
  },

  async chooseImage() {
    const { rateImages } = this.data;
    if (rateImages.length >= 9) {
      wx.showToast({ title: '最多 9 张图片', icon: 'none' });
      return;
    }
    const remaining = 9 - rateImages.length;
    const res = await new Promise((resolve) => {
      wx.chooseImage({
        count: remaining,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: resolve,
        fail: () => resolve({ tempFilePaths: [], tempFiles: [] }),
      });
    });
    const newPaths = (res.tempFilePaths || []).map(path => ({ url: path, isRemote: false }));
    this.setData({ rateImages: [...rateImages, ...newPaths] });
  },

  removeImage(e) {
    const idx = parseInt(e.currentTarget.dataset.idx);
    const { rateImages } = this.data;
    rateImages.splice(idx, 1);
    this.setData({ rateImages });
  },

  onCommentInput(e) {
    this.setData({ rateComment: e.detail.value });
  },

  async submitRating() {
    const { rateStallId, rateScore, rateImages, rateComment, rateSubmitting } = this.data;
    if (rateSubmitting) return;
    if (!rateScore) {
      wx.showToast({ title: '请选择一个评分等级', icon: 'none' });
      return;
    }
    this.setData({ rateSubmitting: true });
    wx.showLoading({ title: '提交中...' });

    try {
      // 1. 先上传本地图片
      const uploadedUrls = [];
      for (const img of rateImages) {
        if (img.isRemote) {
          // 已上传过的远程图片直接保留
          uploadedUrls.push(img.url);
        } else {
          const upRes = await api.uploadImage(img.url);
          if (upRes && upRes.success && upRes.data && upRes.data.url) {
            uploadedUrls.push(api.fixUrl(upRes.data.url));
          }
        }
      }

      // 2. 提交评价
      const res = await api.submitStallReview(
        rateStallId,
        rateScore,
        rateComment.trim(),
        uploadedUrls.length > 0 ? uploadedUrls : null,
      );

      wx.hideLoading();
      if (res && res.success) {
        this.setData({ showRateModal: false, rateSubmitting: false });
        wx.showToast({ title: res.message || '评价成功！', icon: 'success' });
        // 刷新列表，让评分更新
        this.loadFoodList(true);
        // 如果详情弹窗打开的是同一个档口，也刷新详情
        if (this.data.showDetailSheet && this.data.detailStall && String(this.data.detailStall._id) === String(rateStallId)) {
          this.onFoodTap({ currentTarget: { dataset: { id: rateStallId } } });
        }
      } else {
        this.setData({ rateSubmitting: false });
        wx.showToast({ title: res.message || '提交失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      this.setData({ rateSubmitting: false });
      console.error('[food] submitRating error:', err);
      wx.showToast({ title: '网络错误，请重试', icon: 'none' });
    }
  },

  // ===== 吃什么 Tab =====
  onDraw() {
    if (this.data.drawing) return;
    const pool = this._getAvailablePool();
    if (pool.length === 0) {
      wx.showToast({ title: '没有可抽的菜', icon: 'none' });
      return;
    }
    this.setData({ drawing: true });
    let count = 0;
    const timer = setInterval(() => {
      const idx = Math.floor(Math.random() * pool.length);
      this.setData({ drawResult: this._formatFoodItem(pool[idx]) });
      count++;
      if (count >= 8) {
        clearInterval(timer);
        const finalIdx = Math.floor(Math.random() * pool.length);
        this.setData({ drawing: false, drawResult: this._formatFoodItem(pool[finalIdx]) });
      }
    }, 80);
  },

  _getAvailablePool() {
    const all = this.data.foodList;
    const excludeMap = this.data._excludeIds;
    return all.filter(item => !excludeMap[item._id]);
  },

  _updatePoolLength() {
    this.setData({ filteredPoolLength: this._getAvailablePool().length });
  },

  // 不吃列表
  _loadExcludeList() {
    const list = wx.getStorageSync('food_exclude_list') || [];
    const map = {};
    list.forEach(item => { map[item._id] = true; });
    this.setData({ excludeList: list, _excludeIds: map });
  },

  _saveExcludeList(list) {
    const map = {};
    list.forEach(item => { map[item._id] = true; });
    wx.setStorageSync('food_exclude_list', list);
    this.setData({ excludeList: list, _excludeIds: map });
    this._updatePoolLength();
  },

  onExcludeDish() {
    const item = this.data.drawResult;
    if (!item) return;
    if (this.data._excludeIds[item._id]) {
      wx.showToast({ title: '已经在不吃列表了', icon: 'none' });
      return;
    }
    const newList = [
      { _id: item._id, title: item.name, cover: item.cover_image, canteenName: item.canteenName, price: item.price },
      ...this.data.excludeList,
    ];
    this._saveExcludeList(newList);
    wx.showToast({ title: '已加入不吃清单', icon: 'success' });
    const pool = this._getAvailablePool();
    if (pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      this.setData({ drawResult: this._formatFoodItem(pool[idx]) });
    } else {
      this.setData({ drawResult: null });
    }
  },

  // ===== 我的评分弹窗 =====
  onOpenMyRatings() {
    this.setData({ showMyRatingsSheet: true, myRatingsLoading: true });
    this._loadMyRatings();
  },
  onCloseMyRatingsSheet() {
    this.setData({ showMyRatingsSheet: false });
  },
  async _loadMyRatings() {
    try {
      const res = await api.getMyReviews({ page: 1, pageSize: 50 });
      const list = (res && res.data && Array.isArray(res.data) ? res.data : res.list || []);
      const ratings = list.map(item => {
        const r = Number(item.rating) || 0;
        const level = RATING_LEVELS.find(l => l.score === Math.round(r));
        return {
          ...item,
          _id: item.id || item._id,
          _stallName: item.stallName || item.targetName || '档口',
          _ratingIcon: level ? level.icon : 'svg-ico-star',
          _ratingLabel: level ? level.label : '',
        };
      });
      this.setData({ myRatingsList: ratings, myRatingsCount: ratings.length, myRatingsLoading: false });
    } catch (e) {
      this.setData({ myRatingsList: [], myRatingsCount: 0, myRatingsLoading: false });
    }
  },

  // ===== 我的收藏弹窗 =====
  onOpenMyFavorites() {
    this.setData({ showMyFavoritesSheet: true, myFavoritesLoading: true });
    this._loadMyFavorites();
  },
  onCloseMyFavoritesSheet() {
    this.setData({ showMyFavoritesSheet: false });
  },
  async _loadMyFavorites() {
    try {
      const res = await api.getMyModuleFavorites('food', { page: 1, pageSize: 50 });
      const list = (res && res.list) ? res.list : [];
      this.setData({ myFavoritesList: list, myFavoritesCount: list.length, myFavoritesLoading: false });
    } catch (e) {
      this.setData({ myFavoritesList: [], myFavoritesCount: 0, myFavoritesLoading: false });
    }
  },

  // ===== 不吃清单弹窗 =====
  onOpenExcludeSheet() {
    this.setData({ showExcludeSheet: true });
  },

  onCloseExcludeSheet() {
    this.setData({ showExcludeSheet: false });
  },

  onRemoveExcludeItem(e) {
    const { index } = e.currentTarget.dataset;
    const list = [...this.data.excludeList];
    if (index == null || index < 0 || index >= list.length) return;
    const removed = list.splice(index, 1)[0];
    const map = { ...this.data._excludeIds };
    if (removed && removed._id) delete map[removed._id];
    wx.setStorageSync('food_exclude_list', list);
    this.setData({ excludeList: list, _excludeIds: map });
    this._updatePoolLength();
    wx.showToast({ title: '已移除', icon: 'success' });
    // 如果当前结果被移除了，自动换一个新的
    const { drawResult } = this.data;
    if (drawResult && drawResult._id && map[drawResult._id] === undefined) {
      // 已经被移除了，不做处理
    }
  },

  onClearExcludeSheet() {
    wx.showModal({
      title: '清空不吃清单',
      content: '确定要清空全部排除的菜品吗？',
      confirmColor: '#FF3B30',
      success: (res) => {
        if (!res.confirm) return;
        wx.setStorageSync('food_exclude_list', []);
        this.setData({ excludeList: [], _excludeIds: {} });
        this._updatePoolLength();
        this.setData({ showExcludeSheet: false });
        wx.showToast({ title: '已清空', icon: 'success' });
      },
    });
  },

  // ===== 我的 Tab =====
  onMyFavorites() {
    wx.navigateTo({ url: '/subpkg/favorites/favorites' });
  },
  onFeedback() {
    wx.navigateTo({ url: '/subpkg/feedback/feedback' });
  },
  onAbout() {
    wx.showModal({
      title: '关于我们',
      content: '食堂推荐 · 发现校园好味道\n©2026 {{BRAND_NAME}}',
      showCancel: false,
    });
  },

  goBack() { wx.vibrateShort({ type: 'light' }); wx.navigateBack(); },

  onShareAppMessage() {
    return { title: '食堂推荐 · 发现校园好味道', path: '/subpkg/food/food' };
  },
  onShareTimeline() {
    return { title: '食堂推荐 · 发现校园好味道' };
  },
});
