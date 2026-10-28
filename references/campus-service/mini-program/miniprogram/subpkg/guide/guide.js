// subpkg/guide/guide.js — 校园图鉴 · 4Tab
const api = require('../../utils/api');
const guideData = require('./guide-data.js');

Page({
  data: {
    statusBarHeight: 44,
    panelHeight: 600,
    currentTab: 0,
    tabNames: ['图鉴广场', '图鉴大全', '发布图鉴', '我的图鉴'],
    systemUnread: 0,

    // 分类数据
    categories: [],

    // 广场
    feedCategory: 'all',
    feedList: [],
    feedPage: 1,
    feedLoading: false,
    leftCol: [],
    rightCol: [],

    // 大全
    allCategory: 'all',
    // 大全-球壳
    sphereCategory: 'all',
    allKeyword: '',
    allList: [],
    allLoading: false,

    // 发布
    pubImages: [],
    pubName: '',
    pubCategoryKey: '',
    pubCategoryName: '',
    pubDesc: '',
    pubLocationName: '',
    pubLocationLat: '',
    pubLocationLng: '',
    pubLocationText: '',
    pubPhotoDate: '',
    pubDifficulty: '',
    pubSeason: '',
    pubSubmitting: false,
    showCatPicker: false,
    difficultyOptions: [
      { val: 'easy',   label: '🌱 轻松' },
      { val: 'medium', label: '🥾 适中' },
      { val: 'hard',   label: '⛰️ 较难' },
    ],
    seasonOptions: [
      { val: 'spring', label: '🌸 春' },
      { val: 'summer', label: '☀️ 夏' },
      { val: 'fall',   label: '🍁 秋' },
      { val: 'winter', label: '❄️ 冬' },
      { val: 'all',    label: '🌍 四季' },
],

    // 我的
    myList: [],
    myLoading: false,
    myTotal: 0,
    myApproved: 0,
    myPending: 0,
  },

  onLoad() {
    try {
      const sys = wx.getSystemInfoSync();
      const statusBarHeight = sys.statusBarHeight || 44;
      const navHeight = 88 * sys.windowWidth / 750;
      const tabbarHeight = 110 * sys.windowWidth / 750 + (sys.safeArea ? (sys.screenHeight - sys.safeArea.bottom) : 0);
      const panelHeight = sys.windowHeight - statusBarHeight - navHeight - tabbarHeight;
      this.setData({ statusBarHeight, panelHeight: Math.max(panelHeight, 400) });
    } catch (e) {}

    this.loadCategories();
  },

  onShow() {
    // 切换到我的tab时刷新
    if (this.data.currentTab === 3 && !this._firstShow) {
      this.loadMyEntries();
    }
    this._firstShow = false;
  },

  // ========== 分类数据 ==========
  async loadCategories() {
    try {
      const res = await api.getGuideCategories();
      if (res.success) {
        this.setData({ categories: res.data });
      }
    } catch (e) {}
    // 同时加载本地分类映射
    this._localCatMap = {};
    try {
      const localCats = guideData.getAllCategories();
      localCats.forEach(k => { this._localCatMap[k] = true; });
    } catch (e) {}

    this.loadFeed();
  },

  // ========== Tab 切换 ==========
  switchTab(e) {
    wx.vibrateShort({ type: 'light' });
    const tab = parseInt(e.currentTarget.dataset.tab);
    if (tab === this.data.currentTab) return;

    // 切走大全时停动画、清引用（wx:if 会销毁 canvas 节点）
    if (this.data.currentTab === 1) {
      this.stopSphereAnim();
      this._sphereCanvas = null;
      this._sphereCtx = null;
    }

    this.setData({ currentTab: tab }, () => {
      // 按需加载数据
      if (tab === 0 && this.data.feedList.length === 0) this.loadFeed();
      if (tab === 1) this.initSphereCanvas();
      if (tab === 3) this.loadMyEntries();
    });
  },

  // ========== 广场 ==========
  async loadFeed(reset) {
    if (this.data.feedLoading) return;
    if (reset) this.setData({ feedPage: 1, feedList: [], leftCol: [], rightCol: [] });

    this.setData({ feedLoading: true });
    try {
      const res = await api.getGuideFeed({
        page: reset ? 1 : this.data.feedPage,
        pageSize: 20,
        category: this.data.feedCategory,
      });
      if (res.success) {
        const list = reset ? res.list : [...this.data.feedList, ...res.list];
        // 处理图片URL
        const processed = list.map(item => {
          let _displayImg = item.icon || '';
          if (item.images && item.images.length > 0) _displayImg = item.images[0];
          // 交错高度：用id做伪随机，产生错落瀑布效果
          const seed = item.id % 4;
          const heights = [220, 300, 260, 340];
          return { ...item, _displayImg, _imageHeight: heights[seed] };
        });
        this.setData({
          feedList: processed,
          feedPage: (reset ? 1 : this.data.feedPage) + 1,
        });
        this.distributeWaterfall();
      }
    } catch (e) {
      console.error('[图鉴广场] 加载失败:', e);
    }
    this.setData({ feedLoading: false });
  },

  distributeWaterfall() {
    const list = this.data.feedList;
    const left = [], right = [];
    let leftH = 0, rightH = 0;
    list.forEach(item => {
      if (leftH <= rightH) {
        left.push(item);
        leftH += item._imageHeight;
      } else {
        right.push(item);
        rightH += item._imageHeight;
      }
    });
    this.setData({ leftCol: left, rightCol: right });
  },

  switchFeedCat(e) {
    const cat = e.currentTarget.dataset.cat;
    if (cat === this.data.feedCategory) return;
    this.setData({ feedCategory: cat });
    this.loadFeed(true);
  },

  onFeedTap(e) {
    const item = e.currentTarget.dataset.item;
    if (!item) return;
    wx.showModal({
      title: item.name,
      content: item.description || '暂无描述',
      showCancel: false,
      confirmText: '知道了',
    });
  },

  // ========== 大全 (3D球壳) ==========
  // 7个分类的本地数据，每类一个同心球壳
  _sphereCats: [
    { key: 'landmarks',     name: '校园地标', color: '#FF9500', glow: 'rgba(255,149,0,0.45)' },
    { key: 'organizations', name: '社团组织', color: '#AF52DE', glow: 'rgba(175,82,222,0.45)' },
    { key: 'animals',       name: '动物图鉴', color: '#30D158', glow: 'rgba(48,209,88,0.45)' },
    { key: 'plants',        name: '植物图鉴', color: '#34C759', glow: 'rgba(52,199,89,0.45)' },
    { key: 'awards',        name: '任职评优', color: '#FFD60A', glow: 'rgba(255,214,10,0.45)' },
    { key: 'certificates',  name: '证书图鉴', color: '#6CD4FF', glow: 'rgba(108,212,255,0.45)' },
    { key: 'limited',       name: '限定图鉴', color: '#FF375F', glow: 'rgba(255,55,95,0.45)' },
  ],
  _sphereNodes: [],   // 节点数组
  _sphereCam: { yaw: 0, pitch: 0, vyaw: 0, vpitch: 0 },
  _sphereZoom: 1,
  _sphereCtx: null,
  _sphereCanvas: null,
  _sphereAnimId: null,
  _sphereDpr: 1,
  _sphereSize: { w: 0, h: 0 },
  _spherePtr: { active: false, lastX: 0, lastY: 0, lastT: 0, vx: 0, vy: 0 },
  _sphereSelectedId: null,

  buildSphereNodes() {
    // 每个分类一个同心球壳，半径递增
    const cats = this._sphereCats;
    const filter = this.data.sphereCategory;
    const nodes = [];
    const baseR = 100;
    const stepR = 55;
    let id = 0;

    cats.forEach((cat, ci) => {
      if (filter !== 'all' && filter !== cat.key) return;
      const items = guideData.getCategoryData(cat.key);
      const radius = baseR + ci * stepR;
      const n = items.length;
      // 同心球壳：每个分类一个球面，节点按 fibonacci 球面分布
      items.forEach((item, i) => {
        const phi = Math.acos(1 - 2 * (i + 0.5) / n);       // 极角
        const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5); // 黄金角
        nodes.push({
          id: id++,
          catIdx: ci,
          catKey: cat.key,
          catName: cat.name,
          color: cat.color,
          glow: cat.glow,
          title: item.name,
          desc: item.desc,
          emoji: item.emoji || '',
          icon: item.icon || '',
          // 球面本地坐标（球心在原点）
          lx: radius * Math.sin(phi) * Math.cos(theta),
          ly: radius * Math.cos(phi),
          lz: radius * Math.sin(phi) * Math.sin(theta),
          radius: radius,
        });
      });
    });

    this._sphereNodes = nodes;
  },

  initSphereCanvas() {
    if (this._sphereCanvas) return;
    const query = wx.createSelectorQuery();
    query.select('#sphereCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio || 2;
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);
        this._sphereCanvas = canvas;
        this._sphereCtx = ctx;
        this._sphereDpr = dpr;
        this._sphereSize = { w: res[0].width, h: res[0].height };
        this.buildSphereNodes();
        this.startSphereAnim();
      });
  },

  startSphereAnim() {
    if (this._sphereAnimId) return;
    const canvas = this._sphereCanvas;
    if (!canvas) return;
    const step = () => {
      this.renderSphere();
      this._sphereAnimId = canvas.requestAnimationFrame(step);
    };
    this._sphereAnimId = canvas.requestAnimationFrame(step);
  },

  stopSphereAnim() {
    if (this._sphereAnimId && this._sphereCanvas) {
      this._sphereCanvas.cancelAnimationFrame(this._sphereAnimId);
    }
    this._sphereAnimId = null;
  },

  renderSphere() {
    const ctx = this._sphereCtx;
    if (!ctx) return;
    const { w, h } = this._sphereSize;
    const cam = this._sphereCam;

    // 惯性衰减
    if (Math.abs(cam.vyaw) > 0.0008 || Math.abs(cam.vpitch) > 0.0008) {
      cam.yaw += cam.vyaw;
      cam.pitch += cam.vpitch;
      cam.vyaw *= 0.88;
      cam.vpitch *= 0.88;
    }
    if (cam.pitch > 1.0) { cam.pitch = 1.0; cam.vpitch = 0; }
    if (cam.pitch < -1.0) { cam.pitch = -1.0; cam.vpitch = 0; }
    // yaw 归一化到 [-π, π]，避免转好几圈
    while (cam.yaw > Math.PI) cam.yaw -= 2 * Math.PI;
    while (cam.yaw < -Math.PI) cam.yaw += 2 * Math.PI;

    // 清屏
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const zoom = this._sphereZoom || 1;
    const focal = 400;
    const cosY = Math.cos(cam.yaw), sinY = Math.sin(cam.yaw);
    const cosP = Math.cos(cam.pitch), sinP = Math.sin(cam.pitch);

    // 投影每个节点
    const projected = [];
    for (const node of this._sphereNodes) {
      // Yaw 绕 Y 轴
      let x = node.lx * cosY + node.lz * sinY;
      let z = -node.lx * sinY + node.lz * cosY;
      let y = node.ly;
      // Pitch 绕 X 轴
      let y2 = y * cosP - z * sinP;
      let z2 = y * sinP + z * cosP;
      y = y2; z = z2;

      // zoom 影响透视焦距：zoom>1 拉近（放大），zoom<1 推远（缩小）
      const f = focal * zoom;
      const persp = f / (f + z);
      const sx = cx + x * persp;
      const sy = cy + y * persp;

      projected.push({
        node, sx, sy, z, persp,
        front: z < 0,
      });
    }

    // 按 z 排序，远的先画
    projected.sort((a, b) => b.z - a.z);

    // 画节点：色点 + 名字
    for (const p of projected) {
      const { node, sx, sy, persp, front } = p;
      const alpha = front ? 1.0 : 0.35;
      const dotR = Math.max(2, 4 * persp);

      // 色点
      ctx.globalAlpha = alpha;
      ctx.fillStyle = node.color;
      ctx.beginPath();
      ctx.arc(sx, sy, dotR, 0, Math.PI * 2);
      ctx.fill();

      // 选中节点高亮环
      if (node.id === this._sphereSelectedId) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, dotR + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 名字（正面才显示）
      if (front && persp > 0.3) {
        ctx.globalAlpha = Math.min(1, persp);
        ctx.fillStyle = '#3C3C43';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.title, sx + dotR + 4, sy);
      }
    }
    ctx.globalAlpha = 1;
  },

  onSphereTouchStart(e) {
    const t = e.touches[0];
    this._spherePtr.active = true;
    this._spherePtr.lastX = t.clientX;
    this._spherePtr.lastY = t.clientY;
    this._spherePtr.lastT = Date.now();
    this._spherePtr.vx = 0;
    this._spherePtr.vy = 0;
    this._spherePtr.moved = false;
    this._sphereCam.vyaw = 0;
    this._sphereCam.vpitch = 0;
    // 双指缩放
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      this._spherePtr.pinchDist = Math.hypot(dx, dy);
      this._spherePtr.pinchZoom = this._sphereZoom || 1;
    }
  },

  onSphereTouchMove(e) {
    // 双指缩放
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (this._spherePtr.pinchDist > 0) {
        let z = this._spherePtr.pinchZoom * (dist / this._spherePtr.pinchDist);
        z = Math.max(0.3, Math.min(2.5, z));
        this._sphereZoom = z;
      }
      return;
    }
    if (!this._spherePtr.active) return;
    const t = e.touches[0];
    const dx = t.clientX - this._spherePtr.lastX;
    const dy = t.clientY - this._spherePtr.lastY;
    const now = Date.now();
    const dt = Math.max(1, now - this._spherePtr.lastT);

    // 直接位移（不除以 dt，避免小 dt 爆炸）
    this._sphereCam.yaw -= dx * 0.004;
    this._sphereCam.pitch += dy * 0.004;
    if (this._sphereCam.pitch > 1.0) this._sphereCam.pitch = 1.0;
    if (this._sphereCam.pitch < -1.0) this._sphereCam.pitch = -1.0;

    // 记录速度（用于惯性），但限制最大值
    const vx = dx / dt;
    const vy = dy / dt;
    // 限速：单帧位移 dx 本身就是像素，速度最大 2 rad/frame
    this._spherePtr.vx = Math.max(-0.5, Math.min(0.5, -dx * 0.004));
    this._spherePtr.vy = Math.max(-0.5, Math.min(0.5, dy * 0.004));
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) this._spherePtr.moved = true;

    this._spherePtr.lastX = t.clientX;
    this._spherePtr.lastY = t.clientY;
    this._spherePtr.lastT = now;
  },

  onSphereTouchEnd(e) {
    if (!this._spherePtr.active) return;
    this._spherePtr.active = false;
    // 惯性：用最后记录的速度，但严格限制上限
    let vyaw = this._spherePtr.vx;
    let vpitch = this._spherePtr.vy;
    // 限速：单帧最大 0.1 rad
    vyaw = Math.max(-0.1, Math.min(0.1, vyaw));
    vpitch = Math.max(-0.1, Math.min(0.1, vpitch));
    this._sphereCam.vyaw = vyaw;
    this._sphereCam.vpitch = vpitch;
    this._spherePtr.pinchDist = 0;
  },

  onSphereTap(e) {
    // 点击节点检测
    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    const tx = t.clientX, ty = t.clientY;
    const rect = this._sphereSize;
    // 需要把 client 坐标转 canvas 内坐标
    // 由于 canvas 全屏 panel，假设 canvas 左上=panel 左上
    let bestId = null;
    let bestDist = 24; // 24px 命中半径
    const cx = rect.w / 2;
    const cy = rect.h / 2;
    const zoom = this._sphereZoom || 1;
    const focal = 400 * zoom;
    const cam = this._sphereCam;
    const cosY = Math.cos(cam.yaw), sinY = Math.sin(cam.yaw);
    const cosP = Math.cos(cam.pitch), sinP = Math.sin(cam.pitch);

    for (const node of this._sphereNodes) {
      let x = node.lx * cosY + node.lz * sinY;
      let z = -node.lx * sinY + node.lz * cosY;
      let y = node.ly;
      let y2 = y * cosP - z * sinP;
      let z2 = y * sinP + z * cosP;
      y = y2; z = z2;
      if (z > 0) continue;
      const persp = focal / (focal + z);
      const sx = cx + x * persp;
      const sy = cy + y * persp;
      const d = Math.hypot(sx - tx, sy - ty);
      if (d < bestDist) {
        bestDist = d;
        bestId = node.id;
      }
    }

    if (bestId !== null) {
      const node = this._sphereNodes.find(n => n.id === bestId);
      if (node) {
        wx.vibrateShort({ type: 'light' });
        wx.showModal({
          title: node.title,
          content: node.desc || '暂无描述',
          showCancel: false,
          confirmText: '知道了',
        });
      }
    }
  },

  switchSphereCat(e) {
    const cat = e.currentTarget.dataset.cat;
    if (cat === this.data.sphereCategory) return;
    this.setData({ sphereCategory: cat });
    this.buildSphereNodes();
    // 重置视角
    this._sphereCam.yaw = 0;
    this._sphereCam.pitch = 0;
    this._sphereCam.vyaw = 0;
    this._sphereCam.vpitch = 0;
  },

  onAllSearchInput(e) {
    this.setData({ allKeyword: e.detail.value });
  },

  doAllSearch() {
    // 搜索已废弃：球壳版大全不使用搜索
  },

  onAllItemTap(e) {
    const item = e.currentTarget.dataset.item;
    if (!item) return;
    wx.showModal({
      title: item.name,
      content: item.description || '暂无描述',
      showCancel: false,
      confirmText: '知道了',
    });
  },

  // ========== 发布 ==========
  choosePubImg() {
    const remain = 6 - this.data.pubImages.length;
    if (remain <= 0) return;
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const paths = res.tempFiles.map(f => f.tempFilePath);
        this.setData({ pubImages: [...this.data.pubImages, ...paths] });
      },
    });
  },

  removePubImg(e) {
    const idx = e.currentTarget.dataset.index;
    const imgs = [...this.data.pubImages];
    imgs.splice(idx, 1);
    this.setData({ pubImages: imgs });
  },

  previewPubImg(e) {
    const idx = e.currentTarget.dataset.index;
    wx.previewImage({ current: this.data.pubImages[idx], urls: this.data.pubImages });
  },

  onPubInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  onPubChipTap(e) {
    const field = e.currentTarget.dataset.field;
    const val = e.currentTarget.dataset.val;
    const cur = this.data[field];
    // 同字段再点同一项则取消选择
    this.setData({ [field]: cur === val ? '' : val });
  },

  choosePubDate() {
    const today = new Date();
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    wx.showActionSheet({
      itemList: ['今天', '昨天', '一周内', '一个月内', '自定义...'],
      success: (res) => {
        const map = {
          0: fmt(today),
          1: fmt(new Date(today.getTime() - 86400000)),
          2: fmt(new Date(today.getTime() - 7 * 86400000)),
          3: fmt(new Date(today.getTime() - 30 * 86400000)),
        };
        if (res.tapIndex === 4) {
          // 自定义：没有原生 picker，弹个简单 prompt
          wx.showModal({
            title: '输入日期',
            editable: true,
            placeholderText: 'YYYY-MM-DD',
            success: (r) => {
              if (r.confirm && /^\d{4}-\d{2}-\d{2}$/.test((r.content||'').trim())) {
                this.setData({ pubPhotoDate: r.content.trim() });
              }
            }
          });
        } else if (map[res.tapIndex]) {
          this.setData({ pubPhotoDate: map[res.tapIndex] });
        }
      }
    });
  },

  choosePubLocation() {
    const self = this;
    // 优先使用微信原生 chooseLocation（需要用户授权 scope.userLocation）
    wx.chooseLocation({
      success(res) {
        if (res && res.name) {
          self.setData({
            pubLocationName: self.data.pubLocationName || res.name,
            pubLocationLat: res.latitude,
            pubLocationLng: res.longitude,
            pubLocationText: (res.address ? res.address + ' · ' : '') + res.name,
          });
        }
      },
      fail() {
        // 用户拒绝/未授权，提示手动填写
        wx.showToast({ title: '请手动填写拍摄地', icon: 'none' });
      }
    });
  },

  showPubCatPicker() { this.setData({ showCatPicker: true }); },
  hidePubCatPicker() { this.setData({ showCatPicker: false }); },

  selectPubCat(e) {
    const key = e.currentTarget.dataset.key;
    const name = e.currentTarget.dataset.name;
    this.setData({ pubCategoryKey: key, pubCategoryName: name, showCatPicker: false });
  },

  async onPubSubmit() {
    const { pubName, pubCategoryKey, pubDesc, pubImages, pubSubmitting } = this.data;
    if (pubSubmitting) return;
    if (!pubName.trim()) return wx.showToast({ title: '请填写名称', icon: 'none' });
    if (!pubCategoryKey) return wx.showToast({ title: '请选择分类', icon: 'none' });

    this.setData({ pubSubmitting: true });
    wx.showLoading({ title: '上传中...', mask: true });

    try {
      // 上传图片
      let imageUrls = [];
      if (pubImages.length > 0) {
        const uploadRes = await api.uploadImages(pubImages);
        if (uploadRes.success && uploadRes.data && uploadRes.data.urls) {
          imageUrls = uploadRes.data.urls;
        } else {
          throw new Error('图片上传失败');
        }
      }

      // 提交
      const res = await api.submitGuideEntry({
        name: pubName.trim(),
        category_key: pubCategoryKey,
        description: pubDesc.trim(),
        images: imageUrls,
        location_name: this.data.pubLocationName.trim(),
        location_lat: this.data.pubLocationLat === '' ? null : Number(this.data.pubLocationLat),
        location_lng: this.data.pubLocationLng === '' ? null : Number(this.data.pubLocationLng),
        photo_date: this.data.pubPhotoDate || null,
        difficulty: this.data.pubDifficulty || null,
        best_season: this.data.pubSeason || null,
      });

      wx.hideLoading();
      if (res.success) {
        wx.showToast({ title: '提交成功', icon: 'success' });
        // 清空表单
        this.setData({
          pubImages: [], pubName: '', pubCategoryKey: '',
          pubCategoryName: '', pubDesc: '',
          pubLocationName: '', pubLocationLat: '', pubLocationLng: '',
          pubLocationText: '', pubPhotoDate: '',
          pubDifficulty: '', pubSeason: '',
        });
        // 切换到我的tab
        setTimeout(() => {
          this.setData({ currentTab: 3 });
          this.loadMyEntries();
        }, 1500);
      } else {
        wx.showToast({ title: res.message || '提交失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '网络错误', icon: 'none' });
    }
    this.setData({ pubSubmitting: false });
  },

  // ========== 我的 ==========
  async loadMyEntries() {
    this.setData({ myLoading: true });
    try {
      const res = await api.getMyGuideEntries();
      if (res.success) {
        const list = res.list.map(item => {
          let _displayImg = item.icon || '';
          if (item.images && item.images.length > 0) _displayImg = item.images[0];
          return { ...item, _displayImg };
        });
        const approved = list.filter(i => i.status === 'approved').length;
        const pending = list.filter(i => i.status === 'pending').length;
        this.setData({ myList: list, myTotal: list.length, myApproved: approved, myPending: pending });
      }
    } catch (e) {
      console.error('[我的图鉴] 加载失败:', e);
    }
    this.setData({ myLoading: false });
  },

  // ========== 导航 ==========
  goBack() { wx.vibrateShort({ type: 'light' }); wx.navigateBack(); },
  goMsg() { wx.switchTab({ url: '/pages/message/index' }); },

  onShareAppMessage() { return { title: '校园全图鉴 · 记录四年时光的每一个角落' }; },
  onShareTimeline() { return { title: '校园全图鉴 · 记录四年时光的每一个角落' }; },
});
