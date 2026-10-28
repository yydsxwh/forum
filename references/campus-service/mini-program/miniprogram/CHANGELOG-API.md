# API 接入改动文档

> 日期：2026-07-04
> 说明：为 6 个页面接入对应的后端 API 接口，后端地址 `https://{{DOMAIN}}`，所有页面保留本地数据降级（API 不可用时回退）。

---

## 一、utils/api.js — 新增 API 函数

### 兼职专区（Parttime）
| 函数 | 方法 | 路径 | 说明 |
|------|------|------|------|
| `getParttimeList(params)` | GET | `/api/module/parttime` | 分页获取兼职列表，支持 type/keyword/page/pageSize |
| `createParttimePost(data)` | POST | `/api/module/parttime` | 发布兼职信息（需登录） |
| `recommendParttime(id)` | POST | `/api/module/parttime/:id/recommend` | 推荐/点赞（需登录） |

### 校园黄页（Yellowpage）
| 函数 | 方法 | 路径 | 说明 |
|------|------|------|------|
| `getYellowpageList(params)` | GET | `/api/module/yellowpage` | 获取黄页数据，支持 category/keyword 筛选 |

### 校园题库（Questionbank）
| 函数 | 方法 | 路径 | 说明 |
|------|------|------|------|
| `getQuestionbankList(params)` | GET | `/api/module/questionbank` | 获取题库列表，支持 category/keyword 筛选 |

### 校园图鉴（Guide）
| 函数 | 方法 | 路径 | 说明 |
|------|------|------|------|
| `getGuideCategories()` | GET | `/api/guide/categories` | 获取所有图鉴分类（含 count/icon） |
| `getGuideCategoryData(key)` | GET | `/api/guide/:categoryKey` | 获取指定分类下的图鉴条目列表 |

### 校园成就（Achievement）
| 函数 | 方法 | 路径 | 说明 |
|------|------|------|------|
| `getAchievementProgress()` | GET | `/api/achievement/progress` | 获取用户成就进度（需登录） |
| `getAchievementDetail(key)` | GET | `/api/achievement/:trackKey` | 获取赛道成就详情及用户状态（需登录） |
| `submitAchievement(key, itemKey, data)` | POST | `/api/achievement/:trackKey/:itemKey/submit` | 提交成就验证申请（需登录） |

---

## 二、兼职专区 — subpkg/life/parttime/parttime.js

### 改动内容
- 增加 `const api = require('../../utils/api')`
- 本地 demo 数据移到 `DEFAULT_LIST` 常量区
- `onLoad()` → 调用 `this.loadList()` 从后端获取列表
- `loadList()` 异步方法：优先调 `api.getParttimeList()`，成功后解析列表数据（含 timeAgo 格式化）；失败时降级到 `_loadDefaultData()`
- `_loadDefaultData()` 保留本地筛选逻辑
- `onTypeChange()` 切换分类时重置 page=1 并重新加载
- `onSearch()` 搜索时重置 page=1 并重新加载
- `onPullRefresh()` 替换 setTimeout，改为异步 await `loadList()`
- `onLoadMore()` 分页加载
- `onRecommend()` 调用 `api.recommendParttime(id)`，本地乐观更新
- `onSubmitPublish()` 调用 `api.createParttimePost()`，含 loading/错误处理
- 发按钮前检查登录态，未登录跳转登录页

---

## 三、校园黄页 — subpkg/yellowpage/yellowpage.js

### 改动内容
- 增加 `const api = require('../../utils/api')`
- `onLoad()` → 调用 `this.loadData()` 获取数据
- `loadData()` 异步方法：调 `api.getYellowpageList()`，成功则用后端数据；失败降级到本地 79 条
- 数据关联 `this.data.yellowpageData` 而非 `yellowpageData` 常量，确保筛选基于当前数据源

---

## 四、校园题库 — subpkg/questionbank/questionbank.js

### 改动内容
- 增加 `const api = require('../../utils/api')`
- 本地数据移到 `DEFAULT_LIST`
- `onLoad()` → 调用 `this.loadList()` 获取数据
- `loadList()` 异步方法：调 `api.getQuestionbankList()`，成功后数据回填；失败降级
- 增加搜索功能：`onSearchTap()` 本地全量搜索
- 增加 `onClearSearch()` 清除搜索回到分类

---

## 五、校园图鉴 — 大厅 (guide.js) + 7 个子页面

### guide.js — 大厅
- 增加 `const api = require('../../utils/api')`
- `loadCategories()` 异步方法：调 `api.getGuideCategories()`，成功后合并远程 count/icon；失败降级到 `guide-data.js`
- `onLoad()` → 调用 `this.loadCategories()`

### 7 个子页面
| 子页面 | 文件 | categoryKey |
|--------|------|-------------|
| 校园地标 | guide-landmarks/guide-landmarks.js | landmarks |
| 动物图鉴 | guide-animals/guide-animals.js | animals |
| 社团组织 | guide-organizations/guide-organizations.js | organizations |
| 植物图鉴 | guide-plants/guide-plants.js | plants |
| 任职评优 | guide-awards/guide-awards.js | awards |
| 证书图鉴 | guide-certificates/guide-certificates.js | certificates |
| 限定图鉴 | guide-limited/guide-limited.js | limited |

**改动内容（每个子页面统一）：**
- 增加 `const api = require('../../utils/api')`
- `loadData()` 异步方法：调 `api.getGuideCategoryData(key)` 获取远程数据，成功则使用；失败降级到 `guideData.getCategoryData(key)`
- `onLoad()` → 调用 `this.loadData()`

---

## 六、校园成就 — achievement.js + achievement-detail.js

### achievement.js — 成就主页
- 增加 `const api = require('../../utils/api')`
- `loadProgress()` 异步方法：优先调 `api.getAchievementProgress()`，成功后使用远程数据覆盖 tracks/unlockedCount/totalCount/progressPercent；失败降级到 localStorage
- `onLoad()` 和 `onShow()` 均调用 `loadProgress()`

### achievement-detail.js — 赛道详情
- 增加 `const api = require('../../utils/api')`
- `_initTrack()` 改为异步：优先调 `api.getAchievementDetail(trackKey)`，成功后用远程数据（含 status）；失败降级到本地 `ACHIEVEMENT_DATA` + localStorage
- `onSubmitUpload()` 改为异步：先上传图片 (`api.uploadImage`)，再提交验证 (`api.submitAchievement`)；失败降级到 localStorage 模拟

---

## 七、数据降级策略

所有页面遵循 **"优先远程，失败回退"** 原则：

```
loadData() {
  try {
    const res = await api.getXXX().catch(() => null);
    if (res && res.success && res.list 数据有效) {
      // 使用后端数据
      return;
    }
  } catch (e) {
    console.warn('[模块] API 失败:', e);
  }
  // 降级：使用本地备份数据
  this._useLocalData();
}
```

### 各模块降级数据源

| 模块 | 降级数据源 |
|------|-----------|
| 兼职专区 | 文件中 `DEFAULT_LIST` 常量（4条 demo） |
| 校园黄页 | 文件中 `yellowpageData` 常量（79条） |
| 校园题库 | 文件中 `DEFAULT_LIST` 常量（8条） |
| 校园图鉴 | `guide/guide-data.js`（150+条） |
| 校园成就 | `achievement.js` 中 `DEFAULT_TRACKS` + localStorage |
| 成就详情 | `achievement-detail.js` 中 `ACHIEVEMENT_DATA` + localStorage |

---

## 八、需要后端实现的接口总表

| 模块 | URL | 方法 | 需登录 | 说明 |
|------|-----|------|--------|------|
| 兼职专区 | `/api/module/parttime` | GET | 否 | 分页列表，参数: page, pageSize, type, keyword |
| 兼职专区 | `/api/module/parttime` | POST | 是 | 发布兼职 |
| 兼职专区 | `/api/module/parttime/:id/recommend` | POST | 是 | 点赞 |
| 校园黄页 | `/api/module/yellowpage` | GET | 否 | 黄页列表，参数: category, keyword |
| 校园题库 | `/api/module/questionbank` | GET | 否 | 题库列表，参数: category, keyword |
| 校园图鉴 | `/api/guide/categories` | GET | 否 | 分类列表，返回 [{key, name, count, icon}] |
| 校园图鉴 | `/api/guide/:categoryKey` | GET | 否 | 分类详情，返回 [{name, desc, emoji, icon}] |
| 校园成就 | `/api/achievement/progress` | GET | 是 | 用户成就进度 |
| 校园成就 | `/api/achievement/:trackKey` | GET | 是 | 赛道详情含用户状态 |
| 校园成就 | `/api/achievement/:trackKey/:itemKey/submit` | POST | 是 | 提交验证，body: {image, note} |

## 九、后端数据库与代码改动

### 新增 7 张数据库表

| 表名 | 说明 | 记录数 |
|------|------|--------|
| `yellowpages` | 校园黄页（60条参考数据） | 60 |
| `questionbanks` | 校园题库（8条参考数据） | 8 |
| `guide_categories` | 图鉴分类（7个分类） | 7 |
| `guide_items` | 图鉴条目（157条数据） | 157 |
| `achievement_tracks` | 成就赛道定义（4条） | 4 |
| `achievement_items` | 成就项定义（12条+SVG图标） | 12 |
| `user_achievements` | 用户成就记录（运行时写入） | 0 |

### 新增 7 个模型文件

| 文件 | 表名 | 位置 |
|------|------|------|
| `Yellowpage.js` | `yellowpages` | `src/models/` |
| `Questionbank.js` | `questionbanks` | `src/models/` |
| `GuideCategory.js` | `guide_categories` | `src/models/` |
| `GuideItem.js` | `guide_items` | `src/models/` |
| `AchievementTrack.js` | `achievement_tracks` | `src/models/` |
| `AchievementItem.js` | `achievement_items` | `src/models/` |
| `UserAchievement.js` | `user_achievements` | `src/models/` |

### 新增 3 个控制器 + 3 个路由文件

| 路由文件 | 对应控制器 | 端点 |
|---------|-----------|------|
| `routes/reference.js` | `controllers/referenceController.js` | `GET /api/module/yellowpage`, `GET /api/module/questionbank` |
| `routes/guide.js` | `controllers/guideController.js` | `GET /api/guide/categories`, `GET /api/guide/:categoryKey` |
| `routes/achievement.js` | `controllers/achievementController.js` | `GET /api/achievement/progress`, `GET /api/achievement/:trackKey`, `POST /api/achievement/:trackKey/:itemKey/submit` |

### 修改的现有文件

| 文件 | 改动 |
|------|------|
| `src/models/index.js` | 注册 7 个新模型 |
| `src/controllers/moduleController.js` | VALID_MODULES 添加 `parttime`、`questionbank`；新增 `recommend` 方法 |
| `src/routes/module.js` | 新增 `POST /:module/:id/recommend` 路由 |
| `src/app.js` | 注册 referenceRoutes/guideRoutes/achievementRoutes |

### 数据库初始化脚本

| 文件 | 说明 |
|------|------|
| `schema-new-tables.sql` | 7 张表的 DDL 建表语句 |
| `seed-new-tables.sql` | 248 条种子数据（黄页60+题库8+图鉴分类7+图鉴条目157+赛道4+成就项12） |

### 后端可维护性

所有内容均可在后端后台管理界面修改：
- **校园黄页** → `yellowpages` 表，管理员可直接增删改编号和电话号码
- **校园题库** → `questionbanks` 表，管理员可直接管理试题库
- **校园图鉴** → `guide_categories` + `guide_items` 表，分类和条目均可动态变更
- **校园成就** → `achievement_tracks` + `achievement_items` 表，赛道和成就项均可后台管理

无需修改前端代码即可更新内容数据，真正实现"所有内容都可以在后端改动"。
