// pages/detail/detail.js — 通用详情页（拼车 + 模块帖子）
const app = getApp();
const api = require('../../utils/api');

const STATUS_MAP = {
  active: '进行中',
  full: '已满员',
  ended: '已结束',
  cancelled: '已取消',
  expired: '已过期',
  closed: '已关闭',
};

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 64,
    id: '',
    module: '',
    isModule: false,
    detail: null,
    loading: true,
    currentUserId: '',
    formattedTime: '',
    statusText: '',
    hasVehicleInfo: false,
    vehicleInfoText: '',
    hasImages: false,
    hasPrice: false,
    priceText: '',
  },

  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      id: options.id || '',
      module: options.module || '',
      isModule: !!options.module,
    });
    this.loadDetail();
  },

  async loadDetail() {
    this.setData({ loading: true });
    const { id, module, isModule } = this.data;

    if (isModule) {
      await this.loadModuleDetail(id, module);
    } else {
      await this.loadCarpoolDetail(id);
    }
  },

  // 模块帖子详情
  async loadModuleDetail(id, module) {
    // 兼职专区走后端独立 API /api/parttime/jobs/:id
    const isParttime = module === 'parttime';
    const res = isParttime ? await api.getParttimeDetail(id) : await api.getModuleDetail(module, id);
    if (res.success && res.data) {
      const d = res.data;
      const hasPrice = isParttime
        ? !!(d.salary)
        : (d.price != null && d.price > 0);
      const priceText = isParttime
        ? (d.salary || '')
        : (hasPrice ? `¥${d.price}` : '');
      this.setData({
        detail: d,
        formattedTime: api.formatTime(d.createTime),
        statusText: STATUS_MAP[d.status] || d.status || '',
        currentUserId: app.globalData.userInfo?._id || '',
        hasImages: Array.isArray(d.images) && d.images.length > 0,
        hasPrice,
        priceText,
        loading: false,
      });
    } else {
      this.setData({ loading: false });
      api.showToast(res.message || '加载失败');
    }
  },

  // 拼车详情（原有逻辑）
  async loadCarpoolDetail(id) {
    const res = await api.getCarpoolDetail(id);
    if (res.success) {
      const d = res.data;
      const v = d.vehicleInfo || {};
      const vehicleParts = [v.brand, v.color, v.plateNumber].filter(Boolean);
      const hasPrice = d.price != null && d.price > 0;
      this.setData({
        detail: d,
        formattedTime: api.formatTime(d.departureTime),
        statusText: STATUS_MAP[d.status] || d.status || '',
        currentUserId: app.globalData.userInfo?._id || '',
        hasVehicleInfo: vehicleParts.length > 0,
        vehicleInfoText: vehicleParts.join(' · '),
        hasImages: Array.isArray(d.images) && d.images.length > 0,
        hasPrice,
        priceText: hasPrice ? `¥${d.price}${d.priceNote ? ` (${d.priceNote})` : ''}` : '',
        loading: false,
      });
    } else {
      this.setData({ loading: false });
      api.showToast(res.message || '加载失败');
    }
  },

  goBack() { wx.navigateBack(); },

  // 跳转编辑（发布者）
  goEdit() {
    if (!this.data.detail?.isCreator) {
      api.showToast('只有发布者可以编辑');
      return;
    }
    wx.navigateTo({ url: `/subpkg/publish/publish?id=${this.data.id}&mode=edit` });
  },

  // 复制联系方式
  async onCopyContact() {
    const contact = this.data.detail?.contact;
    if (!contact) {
      api.showToast('发布者未提供联系方式');
      return;
    }
    try {
      await new Promise((resolve, reject) => {
        wx.setClipboardData({
          data: String(contact),
          success: resolve,
          fail: reject,
        });
      });
      const masked = String(contact).length > 4
        ? String(contact).slice(0, 3) + '****' + String(contact).slice(-2)
        : String(contact);
      api.showToast(`已复制：${masked}`, 'success');
    } catch (e) {
      api.showToast('复制失败');
    }
  },

  async onJoin() {
    const confirmed = await api.showConfirm('确认加入', `确认加入此行程吗？`);
    if (!confirmed) return;
    api.showLoading('加入中...');
    const res = await api.joinCarpool(this.data.id);
    api.hideLoading();
    if (res.success) {
      // 自动在拼车群发一条消息
      api.sendGroupMessage(this.data.id, '我加入了这次同行，一起出发吧！').catch(() => {});
      api.showToast('加入成功', 'success');
      // 跳转到群聊
      setTimeout(() => {
        wx.navigateTo({ url: `/subpkg/group-chat/group-chat?carpoolId=${this.data.id}` });
      }, 800);
    } else {
      api.showToast(res.message || '加入失败');
    }
  },

  async onCancelJoin() {
    const confirmed = await api.showConfirm('确认取消', '确定要取消加入此行程吗？');
    if (!confirmed) return;
    api.showLoading('取消中...');
    const res = await api.cancelJoinCarpool(this.data.id);
    api.hideLoading();
    if (res.success) {
      api.showToast('已取消', 'success');
      this.loadDetail();
    } else {
      api.showToast(res.message || '操作失败');
    }
  },

  async onEndCarpool() {
    const confirmed = await api.showConfirm('结束行程', '结束后将无法再加入，确认？');
    if (!confirmed) return;
    api.showLoading('处理中...');
    const res = await api.endCarpool(this.data.id);
    api.hideLoading();
    if (res.success) {
      api.showToast('已结束', 'success');
      this.loadDetail();
    } else {
      api.showToast(res.message || '操作失败');
    }
  },

  async onDeleteCarpool() {
    const confirmed = await api.showConfirm('取消发布', '取消后参与者将收到通知，确认？');
    if (!confirmed) return;
    api.showLoading('取消中...');
    const res = await api.deleteCarpool(this.data.id, '发布者取消');
    api.hideLoading();
    if (res.success) {
      api.showToast('已取消', 'success');
      setTimeout(() => wx.navigateBack(), 800);
    } else {
      api.showToast(res.message || '操作失败');
    }
  },

  async onToggleFavorite() {
    const detail = this.data.detail;
    const { id, module, isModule } = this.data;

    if (isModule) {
      const res = await api.toggleModuleFavorite(module, id);
      if (res.success) {
        const wasFav = detail.isFavorited;
        api.showToast(wasFav ? '已取消收藏' : '已收藏', wasFav ? 'none' : 'success');
        this.setData({
          'detail.isFavorited': !wasFav,
          'detail.favoriteCount': Math.max(0, (detail.favoriteCount || 0) + (wasFav ? -1 : 1)),
        });
      } else {
        api.showToast(res.message || '操作失败');
      }
      return;
    }

    if (detail.isFavorited) {
      const res = await api.unfavoriteCarpool(id);
      if (res.success) {
        api.showToast('已取消收藏');
        this.setData({
          'detail.isFavorited': false,
          'detail.favoriteCount': Math.max(0, (detail.favoriteCount || 0) - 1),
        });
      }
    } else {
      const res = await api.favoriteCarpool(id);
      if (res.success) {
        api.showToast('已收藏', 'success');
        this.setData({
          'detail.isFavorited': true,
          'detail.favoriteCount': (detail.favoriteCount || 0) + 1,
        });
      }
    }
  },

  // 进入群聊
  goGroupChat() {
    wx.navigateTo({ url: `/subpkg/group-chat/group-chat?carpoolId=${this.data.id}` });
  },

  goChat() {
    const creator = this.data.detail.creator;
    if (!creator) return;
    wx.navigateTo({ url: `/subpkg/chat/chat?userId=${creator._id}&nickName=${encodeURIComponent(creator.nickName)}` });
  },

  goReview() {
    const d = this.data.detail;
    wx.navigateTo({ url: `/subpkg/review/review?carpoolId=${d._id}&targetUserId=${d.isCreator ? d.participants[0]?.user?._id : d.creator?._id}` });
  },

  goViewReviews() {
    const d = this.data.detail;
    const targetId = d.isCreator ? (d.participants[0] && d.participants[0].user && d.participants[0].user._id || '') : (d.creator && d.creator._id || '');
    if (targetId) {
      wx.navigateTo({ url: `/subpkg/user-reviews/user-reviews?userId=${targetId}` });
    }
  },

  goUserProfile(e) {
    const { userId } = e.currentTarget.dataset;
    if (userId) wx.navigateTo({ url: `/subpkg/user-profile/user-profile?userId=${userId}` });
  },

  // 预览图片
  onPreviewImage(e) {
    const { url } = e.currentTarget.dataset;
    const urls = this.data.detail.images || [];
    if (url) wx.previewImage({ current: url, urls });
  },
});
