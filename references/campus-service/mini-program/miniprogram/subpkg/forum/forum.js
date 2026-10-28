// pages/forum/forum.js — 校园论坛（{{SCHOOL_NAME}}）
const base = getApp().globalData._sharedBase;
const api = require('../../utils/api');

// ===== 论坛首页四板块配置 =====
const HOME_CATEGORIES = [
  {
    key: 'academic',
    icon: 'book-stack',
    name: '学业',
    color: '#4A90D9',
    desc: '课业答疑 · 考证升学 · 选课测评 · 自习互助',
    subTags: ['课业答疑', '考证升学', '选课测评', '自习互助'],
    placeholder: '高数/大物/专业课答疑、四六级/考研经验、老师测评…',
  },
  {
    key: 'life',
    icon: 'home',
    name: '生活',
    color: '#FF9500',
    desc: '拼车跑腿 · 二手交易 · 食堂测评 · 失物招领',
    subTags: ['拼车跑腿', '二手交易', '食堂测评', '宿舍生活', '失物招领'],
    placeholder: '食堂哪个窗口好吃？拼车去高铁站、出闲置课本…',
  },
  {
    key: 'competition',
    icon: 'trophy',
    name: '比赛',
    color: '#E74C3C',
    desc: '竞赛交流 · 实习兼职 · 干部经验',
    subTags: ['竞赛交流', '实习兼职', '干部经验'],
    placeholder: '互联网+/大创组队、数学建模经验、{{SCHOOL_CITY}}实习…',
  },
  {
    key: 'social',
    icon: 'chat-bubble',
    name: '社交',
    color: '#9B59B6',
    desc: '树洞 · 社团活动 · 搭子组队 · 校园趣事',
    subTags: ['树洞', '社团活动', '搭子组队', '校园趣事'],
    placeholder: '匿名吐槽、找学习搭子、社团招新…',
  },
];

// 论坛发布类型
const FORUM_TYPE_OPTIONS = [
  { value: 'chat',      label: '讨论', icon: 'chat-bubble' },
  { value: 'question',  label: '提问', icon: 'question-mark' },
  { value: 'share',     label: '经验', icon: 'lightbulb' },
  { value: 'treehole',  label: '树洞', icon: 'tree' },
];

// 标签数组
const FORUM_TAGS_RAW = [
  '课业答疑', '考证升学', '选课测评', '自习互助',
  '拼车跑腿', '二手交易', '食堂测评', '宿舍生活', '失物招领',
  '竞赛交流', '实习兼职', '干部经验',
  '树洞', '社团活动', '搭子组队', '校园趣事',
];
const FORUM_TAGS = FORUM_TAGS_RAW.map((name, i) => ({ name, hotColor: i % 6 }));

Page({
  data: {
    ...base.baseData,
    moduleName: 'forum',
    searchText: '',
    publishType: 'chat',
    publishTypeOptions: FORUM_TYPE_OPTIONS,
    publishTags: FORUM_TAGS,
    publishAnonymous: false,
    publishVisibility: 'public',

    // 首页板块配置 & 列表
    homeCategories: HOME_CATEGORIES,
    activeFilter: 'all',
    homeList: [],
    homeLoading: true,
    homeLoaded: false,

    // 我的 Tab 子标签
    mineSubTab: 0,
    mineLoading: false,
    myPosts: [],
    myPostsTotal: 0,
    replyList: [],
    replyToMeTotal: 0,
  },

  onLoad() {
    base.baseOnLoad.call(this);
    // 覆盖：加载板块化首页而非扁平列表
    this.loadHomeData();
  },

  onShow() {
    base.baseOnShow.call(this);
  },

  ...base.baseMethods,

  // ===== 覆盖：切换 Tab 时首页加载板块数据 =====
  switchTab(e) {
    try { wx.vibrateShort({ type: 'light' }); } catch (err) { /* 部分设备不支持 */ }
    const index = e.currentTarget.dataset.index;
    this.setData({ currentTab: index });
    if (index === 0 && !this.data.homeLoaded) this.loadHomeData();
    if (index === 2) this.loadMsgData();
    if (index === 3) this.loadMineData();
  },

  // 覆盖 base.goBack，添加返回震动反馈
  goBack() {
    try { wx.vibrateShort({ type: 'light' }); } catch (err) { /* 部分设备不支持 */ }
    wx.navigateBack();
  },

  // ===== 我的 Tab 子标签切换 =====
  onMineSubTabTap(e) {
    const index = parseInt(e.currentTarget.dataset.index, 10);
    this.setData({ mineSubTab: index });
    if (index === 0) this.loadMyPosts();
    else this.loadReplyToMe();
  },

  // ===== 加载我的 Tab 数据 =====
  loadMineData() {
    this.setData({ mineLoading: true });
    Promise.all([this.loadMyPosts(), this.loadReplyToMe()]).finally(() => {
      this.setData({ mineLoading: false });
    });
  },

  // ===== 加载我的发布 =====
  async loadMyPosts() {
    try {
      const res = await api.getMyModulePosts('forum', { page: 1, pageSize: 50 });
      const list = (res && res.list) ? res.list.map(item => ({
        ...item,
        _timeAgo: api.timeAgo(item.createTime),
      })) : [];
      this.setData({
        myPosts: list,
        myPostsTotal: list.length,
      });
    } catch (e) {
      console.error('[forum] loadMyPosts 失败:', e);
      this.setData({ myPosts: [], myPostsTotal: 0 });
    }
  },

  // ===== 加载回复我的（从通知中筛选 module_new_reply 类型） =====
  async loadReplyToMe() {
    try {
      const res = await api.getNotifications({ page: 1, pageSize: 50 });
      const all = (res && res.list) ? res.list : [];
      const replies = all
        .filter(n => n.type === 'module_new_reply')
        .map(n => ({
          id: n.id,
          relatedPost_id: n.relatedPost_id,
          title: (n.content || '').replace(/^.*《(.+?)》.*$/, '$1') || '帖子回复',
          content: n.content || '',
          sender_nickName: n.sender_nickName || '匿名',
          sender_avatarUrl: n.sender_avatarUrl || '/images/default-avatar.png',
          _timeAgo: api.timeAgo(n.createTime),
          read: n.read,
        }));
      this.setData({
        replyList: replies,
        replyToMeTotal: replies.length,
      });
    } catch (e) {
      console.error('[forum] loadReplyToMe 失败:', e);
      this.setData({ replyList: [], replyToMeTotal: 0 });
    }
  },

  onSwiperChange(e) {
    try { wx.vibrateShort({ type: 'light' }); } catch (err) { /* 部分设备不支持 */ }
    const index = e.detail.current;
    this.setData({ currentTab: index });
    if (index === 0 && !this.data.homeLoaded) this.loadHomeData();
    if (index === 2) this.loadMsgData();
    if (index === 3) this.loadMineData();
  },

  // ===== 下拉刷新（首页重载板块数据） =====
  async onPullRefresh() {
    this.setData({ refreshing: true });
    try {
      await this.loadHomeData();
    } finally {
      this.setData({ refreshing: false });
    }
  },

  // ===== 加载首页帖子列表 =====
  async loadHomeData() {
    if (this.data.homeLoading && this.data.homeLoaded) return;
    this.setData({ homeLoading: true });

    try {
      const params = { page: 1, pageSize: 50 };
      if (this.data.activeFilter !== 'all') {
        params.category = this.data.activeFilter;
      }
      const res = await api.getModuleList('forum', params);
      const list = (res && res.list) ? res.list.map(item => ({
        ...item,
        _timeAgo: api.timeAgo(item.createTime),
      })) : [];

      this.setData({
        homeList: list,
        list: list,
        homeLoading: false,
        homeLoaded: true,
        error: null,
      });
    } catch (e) {
      console.error('[forum] loadHomeData 异常:', e);
      this.setData({
        homeLoading: false,
        homeLoaded: true,
        homeList: [],
      });
    }
  },

  // ===== 筛选标签切换 =====
  onFilterTap(e) {
    const cat = e.currentTarget.dataset.cat;
    if (cat === this.data.activeFilter) return;
    this.setData({ activeFilter: cat, homeLoaded: false }, () => {
      this.loadHomeData();
    });
  },

  // ===== 点击板块"查看更多" =====
  onCategoryMore(e) {
    const { key } = e.currentTarget.dataset;
    const cat = HOME_CATEGORIES.find(c => c.key === key);
    if (!cat) return;
    wx.navigateTo({
      url: `/subpkg/forum-category/forum-category?key=${key}&name=${cat.name}&icon=${cat.icon}&color=${encodeURIComponent(cat.color)}`,
    });
  },

  // ===== 点击板块子标签 → 快捷搜索 =====
  onSubTagTap(e) {
    const { tag } = e.currentTarget.dataset;
    if (!tag) return;
    this.setData({ searchText: tag }, () => {
      base.baseMethods.onSearch.call(this);
    });
  },

  // ===== 话题标签多选 =====
  onPublishTagTap(e) {
    const name = e.currentTarget.dataset.name;
    if (!name) return;
    const cur = this.data.publishCategory || '';
    const arr = cur ? cur.split(',').filter(Boolean) : [];
    const idx = arr.indexOf(name);
    if (idx >= 0) {
      arr.splice(idx, 1);
    } else {
      if (arr.length >= 4) {
        wx.showToast({ title: '最多选 4 个话题', icon: 'none' });
        return;
      }
      arr.push(name);
    }
    const newTags = this.data.publishTags.map(t => ({
      ...t,
      active: arr.indexOf(t.name) >= 0,
    }));
    this.setData({
      publishCategory: arr.join(','),
      publishTags: newTags,
    });
  },

  onPublishAnonymousChange(e) {
    this.setData({ publishAnonymous: !!e.detail.value });
  },

  onPublishVisibilityTap(e) {
    this.setData({ publishVisibility: e.currentTarget.dataset.value });
  },

  async onSubmitPublish() {
    if (!this.data.publishType) {
      wx.showToast({ title: '请选择帖子类型', icon: 'none' });
      return;
    }
    if (!this.data.publishTitle || !this.data.publishTitle.trim()) {
      wx.showToast({ title: '请填写标题', icon: 'none' });
      return;
    }
    if (!this.data.publishDesc || !this.data.publishDesc.trim()) {
      wx.showToast({ title: '请填写正文', icon: 'none' });
      return;
    }
    await base.baseMethods.onSubmitPublish.call(this);
    this.setData({
      publishAnonymous: false,
      publishVisibility: 'public',
      publishType: 'chat',
      homeLoaded: false,
    });
  },
});
