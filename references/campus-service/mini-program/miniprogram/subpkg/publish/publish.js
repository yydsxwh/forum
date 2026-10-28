// pages/publish/publish.js
const app = getApp();
const api = require('../../utils/api');

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 64,
    publishBarHeight: 170,
    // 表单数据
    from: '{{SCHOOL_NAME}}',
    to: '{{SCHOOL_CITY}}东站',
    departureDate: '',
    departureTime: '12:00',
    totalSeats: 3,
    contact: '',
    note: '',
    // 同行类型
    tripType: 'find', // find: 找同行, offer: 有空位
    // 标签
    allTags: ['安静', '聊天', '听歌', '不抽烟', '女生优先', '可带行李'],
    selectedTags: {},
    // 提交状态
    submitting: false,
    estimate: null,
    showEstimate: false,
    // 微信订阅消息
    notifySubscribed: false,
    notifyTemplateId: '{{WECHAT_TEMPLATE_ID}}',
  },

  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      publishBarHeight: 170,
      departureDate: this.getTodayStr()
    });
    if (options.id && options.mode === 'edit') {
      this.setData({ editId: options.id, isEdit: true });
      this.loadForEdit(options.id);
    }
  },

  onShow() {
    // 登录拦截已移除（演示模式）
  },

  getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  // 加载编辑数据
  async loadForEdit(id) {
    api.showLoading('加载中...');
    const res = await api.getCarpoolDetail(id);
    api.hideLoading();
    if (res.success && res.data) {
      const d = res.data;
      const dt = new Date(d.departureTime);
      const dateStr = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
      const timeStr = `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
      const selectedTags = {};
      (d.tags || []).forEach(t => selectedTags[t] = true);
      this.setData({
        from: d.from, to: d.to, departureDate: dateStr, departureTime: timeStr,
        totalSeats: d.totalSeats, contact: d.contact || '', note: d.note || '',
        tripType: d.type, selectedTags,
      });
    } else {
      api.showToast('加载失败');
    }
  },

  // 返回
  goBack() {
    wx.navigateBack();
  },

  // 切换出发地/目的地
  swapRoute() {
    const { from, to } = this.data;
    this.setData({ from: to, to: from });
  },

  // 选择日期
  onDateChange(e) {
    this.setData({ departureDate: e.detail.value });
  },

  // 选择时间
  onTimeChange(e) {
    this.setData({ departureTime: e.detail.value });
  },

  // 人数步进
  onSeatsMinus() {
    if (this.data.totalSeats > 1) {
      this.setData({ totalSeats: this.data.totalSeats - 1 });
    }
  },
  onSeatsPlus() {
    if (this.data.totalSeats < 6) {
      this.setData({ totalSeats: this.data.totalSeats + 1 });
    }
  },

  // 切换同行类型
  switchType(e) {
    const { type } = e.currentTarget.dataset;
    this.setData({ tripType: type });
  },

  // 切换标签
  toggleTag(e) {
    const { tag } = e.currentTarget.dataset;
    const selectedTags = { ...this.data.selectedTags };
    if (selectedTags[tag]) {
      delete selectedTags[tag];
    } else {
      selectedTags[tag] = true;
    }
    this.setData({ selectedTags });
  },

  // 联系方式输入
  onContactInput(e) {
    this.setData({ contact: e.detail.value });
  },
  onNoteInput(e) {
    this.setData({ note: e.detail.value });
  },

  // 选择出发地
  pickFrom() {
    wx.navigateTo({
      url: '/subpkg/location-picker/location-picker',
      events: { selectLocation: data => { this.setData({ from: data.name, fromLocation: data }); this.tryEstimate(); } }
    });
  },
  // 选择目的地
  pickTo() {
    wx.navigateTo({
      url: '/subpkg/location-picker/location-picker',
      events: { selectLocation: data => { this.setData({ to: data.name, toLocation: data }); this.tryEstimate(); } }
    });
  },
  // 手动输入出发地
  onFromInput(e) { this.setData({ from: e.detail.value }); },
  onToInput(e) { this.setData({ to: e.detail.value }); },
  // 价格预估
  async tryEstimate() {
    const { from, to } = this.data;
    if (!from || !to) return;
    const res = await api.getRecommendEstimate({ from, to });
    if (res.success && res.data) {
      this.setData({ estimate: res.data, showEstimate: true });
    }
  },

  // 微信订阅消息开关
  onNotifySwitch(e) {
    const checked = e.detail.value;
    if (!checked) {
      this.setData({ notifySubscribed: false });
      return;
    }
    wx.requestSubscribeMessage({
      tmplIds: [this.data.notifyTemplateId],
      success: (res) => {
        const accepted = res[this.data.notifyTemplateId] === 'accept';
        this.setData({ notifySubscribed: accepted });
        if (accepted) {
          wx.showToast({ title: '已开启消息通知', icon: 'success' });
        } else {
          wx.showToast({ title: '你选择了拒绝，有人加入时将收不到通知', icon: 'none' });
        }
      },
      fail: () => {
        this.setData({ notifySubscribed: false });
        wx.showToast({ title: '授权失败，请重试', icon: 'none' });
      }
    });
  },

  // 发布
  async publish() {
    const { from, to, departureDate, departureTime, totalSeats, contact, note, tripType, selectedTags, submitting, notifySubscribed, notifyTemplateId } = this.data;

    if (submitting) return;

    // 校验
    if (!from || !to) {
      api.showToast('请完善出发地和目的地');
      return;
    }
    if (!departureDate) {
      api.showToast('请选择出发日期');
      return;
    }
    if (!contact.trim()) {
      api.showToast('请填写联系方式');
      return;
    }

    this.setData({ submitting: true });
    api.showLoading('发布中...');

    try {
      const departureTimeFull = `${departureDate}T${departureTime}:00`;
      const tags = Object.keys(selectedTags);

      const payload = {
        from,
        to,
        departureTime: departureTimeFull,
        totalSeats,
        remainSeats: totalSeats - 1,
        type: tripType,
        contact: contact.trim(),
        note: note.trim(),
        tags,
        notifySubscribe: notifySubscribed,
        notifyTemplateId: notifySubscribed ? notifyTemplateId : '',
      };

      let res;
      if (this.data.isEdit && this.data.editId) {
        res = await api.updateCarpool(this.data.editId, payload);
      } else {
        res = await api.createCarpool(payload);
      }

      if (res && res.success) {
        api.showToast(this.data.isEdit ? '修改成功！' : '发布成功！', 'success');
        this.setData({ notifySubscribed: false });
        setTimeout(() => { wx.navigateBack(); }, 1000);
      } else {
        api.showToast(res.message || res.error || '操作失败');
      }
    } catch (err) {
      console.error('操作失败:', err);
      api.showToast('网络错误，请重试');
    }

    this.setData({ submitting: false });
    api.hideLoading();
  }
});
