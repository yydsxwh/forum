// scripts/gen-life-pages.js — 生成 6 个校园生活社区类页面
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE = path.join(ROOT, 'miniprogram', 'pages');

const LIFE_PAGES = [
  {
    key: 'dazi',
    name: '校园搭子',
    emoji: '🤝',
    accent: '#E91E63',
    accentBg: '#FCE4EC',
    summary: '找一起吃饭 / 自习 / 运动 / 看电影 的搭子',
    placeholder: '搜索标签 / 文案...',
    typeOptions: [
      { key: 'meal',    name: '干饭搭子' },
      { key: 'study',   name: '学习搭子' },
      { key: 'sport',   name: '运动搭子' },
      { key: 'movie',   name: '观影搭子' },
      { key: 'other',   name: '其他' },
    ],
    demoList: [
      { _id: 'd1', title: '想找周六一起吃火锅的女生搭子', tags: ['干饭', '火锅'], gender: '女', location: '南门火锅街', time: '周六 18:00', desc: '本人女生，吃辣，喜欢牛油锅，找个同样爱吃的姐妹一起~', recommendCount: 12 },
      { _id: 'd2', title: '高数线代期中冲刺搭子',       tags: ['学习', '图书馆'], gender: '不限', location: '图书馆 3 楼', time: '本周末 9:00-22:00', desc: '互相监督、互问问题，本人计科大三大佬一枚，速来！', recommendCount: 35 },
      { _id: 'd3', title: '周三晚上羽毛球场缺一人',     tags: ['运动', '羽毛球'], gender: '男', location: '体育馆 2 楼', time: '周三 19:00-21:00', desc: '水平中等，约得上的话长期组队，AA 制。', recommendCount: 8 },
      { _id: 'd4', title: '周末看电影找搭子 🎬',          tags: ['观影'], gender: '不限', location: '万达影城', time: '周日 14:00', desc: '看《灌篮高手》新片，单人/闺蜜均可，最好自带零食哈哈。', recommendCount: 21 },
    ],
  },
  {
    key: 'checkin',
    name: '校园打卡',
    emoji: '📍',
    accent: '#4CAF50',
    accentBg: '#E8F5E9',
    summary: '分享校园里的高光地点，留下你的足迹',
    placeholder: '搜索地点 / 主题...',
    typeOptions: [
      { key: 'view',   name: '风景打卡' },
      { key: 'food',   name: '美食打卡' },
      { key: 'study',  name: '学习打卡' },
      { key: 'hobby',  name: '兴趣打卡' },
    ],
    demoList: [
      { _id: 'c1', title: '夕阳下的图书馆 📚',     tags: ['学习', '风景'], location: '中央图书馆',  time: '今天 17:42', desc: '今天看了 4 小时书，抬头看见这抹橙色的光，真的太治愈了。', recommendCount: 88 },
      { _id: 'c2', title: '第三食堂新菜踩点 🍗',  tags: ['美食'],         location: '第三食堂',    time: '今天 12:10', desc: '今天上新了椒麻鸡腿饭，味道在线，比黄焖鸡好吃！推荐！', recommendCount: 42 },
      { _id: 'c3', title: '操场夜跑 10 公里 🏃‍♂️', tags: ['运动'],         location: '北操场',     time: '昨晚 21:00', desc: '本月累计 30 公里！操场人多热闹氛围拉满。', recommendCount: 25 },
      { _id: 'c4', title: '艺术楼新展「看见」',     tags: ['风景', '艺术'], location: '艺术楼一层',  time: '昨天 15:00', desc: '今天开幕免费看，摄影 + 数字艺术，喜欢拍照的别错过。', recommendCount: 56 },
    ],
  },
  {
    key: 'plant',
    name: '校园绿植',
    emoji: '🌿',
    accent: '#43A047',
    accentBg: '#E8F8F5',
    summary: '认养、捐赠、交流校园里的花花草草',
    placeholder: '搜索绿植 / 位置...',
    typeOptions: [
      { key: 'adopt',   name: '认养' },
      { key: 'donate',  name: '捐赠' },
      { key: 'trade',   name: '交换' },
      { key: 'question',name: '养护问答' },
    ],
    demoList: [
      { _id: 'p1', title: '图书馆门口多肉认养', tags: ['认养', '多肉'], location: '主图书馆门口', time: '今天 9:00', desc: '一大盆虹之玉，已经长得很满，找个爱绿植的伙伴接它回家。', recommendCount: 32 },
      { _id: 'p2', title: '玉树叶子发黄怎么办？', tags: ['问答'],     location: '不确定',      time: '昨天 21:30', desc: '夏季阳光太强？还是有积水？求植植大佬指点！', recommendCount: 8 },
      { _id: 'p3', title: '换盆多余的薄荷可领', tags: ['交换', '香草'], location: '南操场边',  time: '前天 14:00', desc: '扦插繁殖成功一批，根系健康，自带陶盆带走。', recommendCount: 19 },
      { _id: 'p4', title: '校园春日赏花地图 🌸', tags: ['风景'],      location: '整个校园',   time: '本周', desc: '樱花、玉兰、海棠，三条校园赏花路线整理好啦。', recommendCount: 64 },
    ],
  },
  {
    key: 'exam',
    name: '期末题库',
    emoji: '📚',
    accent: '#2196F3',
    accentBg: '#E3F2FD',
    summary: '历年真题、复习资料、考点笔记',
    placeholder: '搜索课程 / 老师 / 资料...',
    typeOptions: [
      { key: 'past',    name: '历年真题' },
      { key: 'note',    name: '复习笔记' },
      { key: 'summary', name: '考点汇总' },
      { key: 'video',   name: '讲解视频' },
    ],
    demoList: [
      { _id: 'e1', title: '高数（下）2020-2024 历年真题 PDF', tags: ['真题', '数学'], desc: '扫描版 + 答案 + 详细解析，覆盖 4 年共 8 套。', recommendCount: 156 },
      { _id: 'e2', title: '马原期末 100 道高频选择',          tags: ['真题', '政治'], desc: '整理自近 5 年真题 + 模拟题，命中率 90%+。', recommendCount: 88 },
      { _id: 'e3', title: '「电路分析」老师手抄笔记',          tags: ['笔记', '工科'], desc: '完整覆盖 16 章，含老师课上补充例题。', recommendCount: 47 },
      { _id: 'e4', title: '英语六级听力提分攻略 + 60 段材料',   tags: ['笔记', '英语'], desc: '内含 60 段 BBC / VOA 听力原文 + 详解。', recommendCount: 72 },
    ],
  },
  {
    key: 'goods',
    name: '校园好物',
    emoji: '🛍️',
    accent: '#F06292',
    accentBg: '#FFEBEE',
    summary: '测评、推荐、避雷，学生党值得买的好东西',
    placeholder: '搜索好物 / 关键词...',
    typeOptions: [
      { key: 'review',   name: '深度测评' },
      { key: 'recommend',name: '平价推荐' },
      { key: 'avoid',    name: '避雷吐槽' },
      { key: 'groupbuy', name: '拼团' },
    ],
    demoList: [
      { _id: 'g1', title: '百元以内降噪耳机红黑榜 🎧', tags: ['测评'], desc: '学生党用过的 6 款降噪耳机横评，性价比之王是它。', recommendCount: 92 },
      { _id: 'g2', title: '宿舍神器：可折叠迷你洗衣机',     tags: ['推荐'], desc: '搬家友好、3 口之家够用，订单截屏附价格对比。', recommendCount: 64 },
      { _id: 'g3', title: '抠门警告：618 这些别买 ⚠️',     tags: ['避雷'], desc: '往年大促坑过的 5 样东西，今年能避就避。', recommendCount: 38 },
      { _id: 'g4', title: '校门口打印店拼团月卡',           tags: ['拼团'], desc: 'A4 黑白 5 分 / 张，5 人成团，差 2 人。', recommendCount: 12 },
    ],
  },
  {
    key: 'parttime',
    name: '兼职专区',
    emoji: '💼',
    accent: '#FF9800',
    accentBg: '#FFF3E0',
    summary: '靠谱校内兼职 / 实习机会，避免黑中介',
    placeholder: '搜索岗位 / 公司...',
    typeOptions: [
      { key: 'tutor',    name: '家教' },
      { key: 'promotion',name: '校园推广' },
      { key: 'service',  name: '餐饮服务' },
      { key: 'intern',   name: '实习' },
      { key: 'other',    name: '其他' },
    ],
    demoList: [
      { _id: 'p1', title: '高中生数学一对一家教', tags: ['家教', '数学'], salary: '100 元/小时', desc: '高中男生，基础中等偏上，每周末一次，时间可议。要求有耐心、不迟到。', recommendCount: 24 },
      { _id: 'p2', title: '校园周边商家海报派发', tags: ['推广'],       salary: '80 元/天',  desc: '食堂门口 / 教学楼门口，时间自由，半天 4 小时结算一次，结识人脉。', recommendCount: 18 },
      { _id: 'p3', title: '新东方在线实习生招募', tags: ['实习'],       salary: '150 元/天', desc: '远程文案 + 社群运营，每周 3 天，可开实习证明。', recommendCount: 56 },
      { _id: 'p4', title: '咖啡店周末店员',       tags: ['服务'],       salary: '25 元/小时', desc: '主校区西门外 100m，10-22 点，0 经验可教。', recommendCount: 32 },
    ],
  },
];

const WXML = (cfg) => `<!-- pages/life/${cfg.key}/${cfg.key}.wxml — ${cfg.name} -->
<view class="page-life">

  <!-- 半透明背景 -->
  <image class="page-bg" src="/images/bg-page.jpg" mode="aspectFill" />

  <!-- 自定义导航栏 -->
  <view class="life-nav" style="padding-top: {{statusBarHeight}}px;">
    <view class="life-nav-inner">
      <view class="nav-back tap-shrink" bindtap="goBack">
        <view class="back-arrow"></view>
      </view>
      <view class="nav-brand">
        <text class="brand-emoji">${cfg.emoji}</text>
        <text class="brand-name">${cfg.name}</text>
      </view>
      <view class="nav-publish tap-shrink" bindtap="onOpenPublish">
        <view class="np-icon">
          <view class="np-plus-h"></view>
          <view class="np-plus-v"></view>
        </view>
      </view>
    </view>
  </view>

  <!-- 简介 hero -->
  <view class="life-hero">
    <text class="life-hero-title">${cfg.name}</text>
    <text class="life-hero-sub">${cfg.summary}</text>
  </view>

  <!-- 搜索栏 -->
  <view class="search-bar" style="margin-top: 0;">
    <input class="search-input" placeholder="${cfg.placeholder}" value="{{searchText}}" bindinput="onSearchInput" confirm-type="search" bindconfirm="onSearch"/>
    <view class="search-btn tap-shrink" bindtap="onSearch">搜索</view>
  </view>

  <!-- 分类筛选 -->
  <scroll-view class="filter-scroll" scroll-x enhanced show-scrollbar="{{false}}">
    <view class="filter-row">
      <view
        wx:for="{{typeOptions}}" wx:key="key"
        class="filter-chip {{activeType === item.key ? 'active' : ''}}"
        data-key="{{item.key}}"
        bindtap="onTypeChange"
      >{{item.name}}</view>
    </view>
  </scroll-view>

  <!-- 列表 -->
  <scroll-view
    class="life-scroll"
    scroll-y enhanced
    show-scrollbar="{{false}}"
    bindscrolltolower="onLoadMore"
    refresher-enabled
    refresher-triggered="{{refreshing}}"
    bindrefresherrefresh="onPullRefresh"
  >
    <!-- 空状态 -->
    <view wx:if="{{list.length === 0}}" class="empty-state">
      <view class="empty-icon">${cfg.emoji}</view>
      <text class="empty-text">还没有内容</text>
      <text class="empty-hint">快来发布第一条分享吧</text>
    </view>

    <!-- 列表 -->
    <view wx:else class="life-list">
      <view
        wx:for="{{list}}" wx:key="_id"
        class="life-card tap-shrink"
        data-id="{{item._id}}"
        bindtap="onItemTap"
      >
        <view class="life-card-header">
          <text class="life-card-title">{{item.title}}</text>
          <view class="life-card-tags" wx:if="{{item.tags && item.tags.length > 0}}">
            <view class="life-tag" wx:for="{{item.tags}}" wx:for-item="tag" wx:key="*this">{{tag}}</view>
          </view>
        </view>

        <view class="life-card-meta" wx:if="{{item.location || item.time || item.salary || item.gender}}">
          <text wx:if="{{item.location}}">📍 {{item.location}}</text>
          <text wx:if="{{item.time}}">· 🕒 {{item.time}}</text>
          <text wx:if="{{item.gender}}">· {{item.gender}}</text>
          <text wx:if="{{item.salary}}" class="life-card-salary">{{item.salary}}</text>
        </view>

        <text class="life-card-desc">{{item.desc}}</text>

        <view class="life-card-footer">
          <view class="life-rec-count">
            <text class="life-rec-icon">👍</text>
            <text>{{item.recommendCount || 0}} 人感兴趣</text>
          </view>
          <view class="life-rec-btn tap-shrink" catchtap="onRecommend">
            <text>点赞</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部 -->
    <view class="page-footer">
      <text class="footer-text">同行鸭 · 仅限学习交流使用</text>
      <text class="footer-icp-text">©2026 {{BRAND_NAME}} 版权所有</text>
    </view>
    <view class="bottom-safe"></view>
  </scroll-view>

  <!-- 发布弹窗 -->
  <view class="publish-overlay" wx:if="{{showPublish}}" bindtap="onClosePublish">
    <view class="publish-modal" catchtap="">
      <view class="publish-header">
        <text class="publish-title">发布到${cfg.name}</text>
        <view class="publish-close tap-shrink" bindtap="onClosePublish">✕</view>
      </view>

      <view class="publish-form">
        <view class="pf-item">
          <text class="pf-label">标题</text>
          <input class="pf-input" placeholder="一句话说清楚 ${cfg.summary}" value="{{publishTitle}}" bindinput="onPublishTitleInput" maxlength="40"/>
        </view>

        <view class="pf-item">
          <text class="pf-label">类型</text>
          <view class="pf-options">
            <view
              wx:for="{{typeOptions}}" wx:key="key"
              class="pf-option {{publishType === item.key ? 'active' : ''}}"
              data-key="{{item.key}}"
              bindtap="onPublishTypeChange"
            >{{item.name}}</view>
          </view>
        </view>

        <view class="pf-item">
          <text class="pf-label">详情描述</text>
          <textarea class="pf-textarea" placeholder="详细说说你需要的条件 / 内容 / 期待..." value="{{publishDesc}}" bindinput="onPublishDescInput" maxlength="300"/>
        </view>

        <view class="pf-submit tap-shrink" bindtap="onSubmitPublish">发布</view>
      </view>
    </view>
  </view>
</view>
`;

const WXSS = (cfg) => `/* pages/life/${cfg.key}/${cfg.key}.wxss */

/* ===== 页面背景 ===== */
.page-life {
  min-height: 100vh;
  background: transparent;
  position: relative;
}
.page-bg {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

/* ===== 导航栏 ===== */
.life-nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 200;
  background: rgba(255,255,255,.85);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-bottom: 1rpx solid rgba(0,0,0,.04);
}
.life-nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
}
.nav-back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.back-arrow {
  width: 20rpx;
  height: 20rpx;
  border-left: 5rpx solid #1C1C1E;
  border-bottom: 5rpx solid #1C1C1E;
  transform: rotate(45deg);
  margin-left: 6rpx;
}
.nav-brand {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.brand-emoji {
  font-size: 40rpx;
  line-height: 1;
}
.brand-name {
  font-size: 34rpx;
  font-weight: 700;
  color: #1C1C1E;
}
.nav-publish {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.np-icon {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: ${cfg.accent};
  position: relative;
}
.np-plus-h, .np-plus-v {
  position: absolute;
  background: #FFF;
  border-radius: 2rpx;
}
.np-plus-h {
  width: 22rpx; height: 4rpx;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
}
.np-plus-v {
  width: 4rpx; height: 22rpx;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
}

/* ===== Hero ===== */
.life-hero {
  position: relative;
  z-index: 1;
  padding: ${cfg.accent ? '40rpx 24rpx 16rpx' : ''};
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.life-hero-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #1C1C1E;
}
.life-hero-sub {
  font-size: 26rpx;
  color: #5C5C60;
}

/* ===== 搜索 ===== */
.search-bar {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  margin: 24rpx 24rpx 16rpx;
  background: rgba(255,255,255,.85);
  border-radius: 999rpx;
  padding: 8rpx 8rpx 8rpx 28rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,.04);
}
.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #1C1C1E;
}
.search-btn {
  background: ${cfg.accent};
  color: #FFF;
  font-size: 28rpx;
  font-weight: 600;
  padding: 14rpx 36rpx;
  border-radius: 999rpx;
}

/* ===== 分类筛选 ===== */
.filter-scroll {
  position: relative;
  z-index: 1;
  white-space: nowrap;
  padding: 0 24rpx 16rpx;
}
.filter-row {
  display: inline-flex;
  gap: 16rpx;
}
.filter-chip {
  display: inline-block;
  padding: 12rpx 28rpx;
  background: rgba(255,255,255,.85);
  border-radius: 999rpx;
  font-size: 26rpx;
  color: #1C1C1E;
  border: 1rpx solid transparent;
}
.filter-chip.active {
  background: ${cfg.accent};
  color: #FFF;
  font-weight: 600;
}

/* ===== 滚动容器 ===== */
.life-scroll {
  position: fixed;
  left: 0; right: 0;
  bottom: 0;
  z-index: 1;
}

/* ===== 列表 ===== */
.life-list {
  padding: 0 24rpx;
}
.life-card {
  background: rgba(255,255,255,.95);
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,.05);
}
.life-card-header {
  margin-bottom: 12rpx;
}
.life-card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1C1C1E;
  display: block;
  margin-bottom: 8rpx;
}
.life-card-tags {
  display: flex;
  gap: 8rpx;
  flex-wrap: wrap;
}
.life-tag {
  padding: 4rpx 14rpx;
  background: ${cfg.accentBg};
  color: ${cfg.accent};
  font-size: 22rpx;
  border-radius: 999rpx;
  font-weight: 600;
}
.life-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4rpx;
  font-size: 24rpx;
  color: #8E8E93;
  margin-bottom: 12rpx;
}
.life-card-salary {
  color: ${cfg.accent};
  font-weight: 700;
  margin-left: 8rpx;
}
.life-card-desc {
  display: block;
  font-size: 26rpx;
  color: #5C5C60;
  line-height: 1.5;
  margin-bottom: 16rpx;
}
.life-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12rpx;
  border-top: 1rpx solid #F2F2F7;
}
.life-rec-count {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 22rpx;
  color: #8E8E93;
}
.life-rec-icon {
  font-size: 24rpx;
}
.life-rec-btn {
  padding: 10rpx 28rpx;
  background: ${cfg.accentBg};
  color: ${cfg.accent};
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 600;
}

/* ===== 空 / 底部 ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 0;
}
.empty-icon {
  font-size: 80rpx;
  margin-bottom: 16rpx;
}
.empty-text {
  font-size: 30rpx;
  color: #1C1C1E;
  font-weight: 600;
}
.empty-hint {
  font-size: 24rpx;
  color: #8E8E93;
  margin-top: 8rpx;
}

.page-footer {
  text-align: center;
  padding: 40rpx 24rpx 0;
}
.footer-text {
  font-size: 22rpx;
  color: #C7C7CC;
  display: block;
}
.footer-icp-text {
  font-size: 20rpx;
  color: #C7C7CC;
  display: block;
  margin-top: 8rpx;
}
.bottom-safe {
  height: calc(40rpx + constant(safe-area-inset-bottom));
  height: calc(40rpx + env(safe-area-inset-bottom));
}

/* ===== 发布弹窗 ===== */
.publish-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  background: rgba(0,0,0,.45);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.publish-modal {
  background: #FFF;
  border-radius: 32rpx 32rpx 0 0;
  padding: 28rpx 32rpx 40rpx;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}
.publish-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.publish-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1C1C1E;
}
.publish-close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  color: #8E8E93;
}
.publish-form {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  overflow-y: auto;
}
.pf-item {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.pf-label {
  font-size: 26rpx;
  color: #5C5C60;
  font-weight: 600;
}
.pf-input {
  background: #F5F5F7;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  color: #1C1C1E;
}
.pf-textarea {
  background: #F5F5F7;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  color: #1C1C1E;
  min-height: 180rpx;
  width: 100%;
  box-sizing: border-box;
}
.pf-options {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.pf-option {
  padding: 12rpx 24rpx;
  background: #F5F5F7;
  border-radius: 999rpx;
  font-size: 26rpx;
  color: #5C5C60;
}
.pf-option.active {
  background: ${cfg.accent};
  color: #FFF;
}
.pf-submit {
  background: linear-gradient(135deg, ${cfg.accent}, ${cfg.accent}AA);
  color: #FFF;
  font-size: 30rpx;
  font-weight: 700;
  text-align: center;
  padding: 26rpx 0;
  border-radius: 999rpx;
  margin-top: 16rpx;
}

.tap-shrink:active {
  transform: scale(0.97);
  opacity: .85;
}
`;

const JS = (cfg) => `// pages/life/${cfg.key}/${cfg.key}.js — ${cfg.name}（本地 demo 数据，待接 API）
const app = getApp();

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 88,
    typeOptions: ${JSON.stringify(cfg.typeOptions, null, 2)},
    activeType: 'all',

    list: ${JSON.stringify(cfg.demoList, null, 2)},
    loading: false,
    refreshing: false,
    hasMore: false,

    searchText: '',

    showPublish: false,
    publishTitle: '',
    publishType: '${cfg.typeOptions[0].key}',
    publishDesc: '',
  },

  onLoad() {
    const win = wx.getWindowInfo();
    this.setData({
      statusBarHeight: win.statusBarHeight || 44,
      navBarHeight: (win.statusBarHeight || 44) + 44,
    });
  },

  goBack() { wx.navigateBack(); },

  onTypeChange(e) {
    this.setData({ activeType: e.currentTarget.dataset.key });
  },

  onSearchInput(e) { this.setData({ searchText: e.detail.value }); },

  onSearch() {
    const kw = (this.data.searchText || '').trim();
    if (!kw) return;
    const filtered = this.data.list.filter(it => (it.title + ' ' + (it.desc || '')).includes(kw));
    this.setData({ list: filtered });
  },

  onItemTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.showToast({ title: '详情页即将上线 (id=' + id + ')', icon: 'none' });
  },

  onRecommend(e) {
    wx.showToast({ title: '👍 点赞 +1', icon: 'none' });
  },

  onPullRefresh() {
    this.setData({ refreshing: true });
    setTimeout(() => this.setData({ refreshing: false }), 800);
  },

  onLoadMore() {
    // demo 数据已全部展示
  },

  onOpenPublish() {
    this.setData({ showPublish: true });
  },

  onClosePublish() {
    this.setData({ showPublish: false, publishTitle: '', publishDesc: '' });
  },

  onPublishTitleInput(e) { this.setData({ publishTitle: e.detail.value }); },
  onPublishDescInput(e) { this.setData({ publishDesc: e.detail.value }); },

  onPublishTypeChange(e) {
    this.setData({ publishType: e.currentTarget.dataset.key });
  },

  onSubmitPublish() {
    const { publishTitle, publishDesc } = this.data;
    if (!publishTitle.trim()) return wx.showToast({ title: '请输入标题', icon: 'none' });
    if (!publishDesc.trim()) return wx.showToast({ title: '请输入描述', icon: 'none' });
    // 发布功能预留：接入后端接口后替换下方 toast 为 api.post 调用
    wx.showToast({ title: '发布成功（演示）', icon: 'success' });
    this.onClosePublish();
  },
});
`;

// 生成
LIFE_PAGES.forEach((cfg) => {
  const dir = path.join(BASE, 'life', cfg.key);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, cfg.key + '.json'),  `{"navigationStyle":"custom","usingComponents":{}}\n`);
  fs.writeFileSync(path.join(dir, cfg.key + '.wxml'), WXML(cfg));
  fs.writeFileSync(path.join(dir, cfg.key + '.wxss'), WXSS(cfg));
  fs.writeFileSync(path.join(dir, cfg.key + '.js'),    JS(cfg));
  console.log('OK ' + cfg.key);
});

console.log('\\n完成 ' + LIFE_PAGES.length + ' 个生活类页面');
