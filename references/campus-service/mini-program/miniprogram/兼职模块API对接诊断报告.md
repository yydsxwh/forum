# 兼职模块 API 对接诊断报告

> 诊断时间：2026-07-04
> 涉及文件：`utils/api.js`、`subpkg/life/parttime/parttime.js`、`subpkg/detail/detail.js`
> 后端地址：`https://{{DOMAIN}}`

---

## 一、已修复的问题

### 🔴 问题 1：`api.getParttimeList is not a function`

- **位置**：`parttime.js` 第 102 行
- **原因**：`api.js` 的 `module.exports` 中未定义 `getParttimeList` 函数
- **修复**：在 `api.js` 中新增函数，封装通用模块 API：
  ```js
  async function getParttimeList(params = {}) {
    return getModuleList('parttime', params);
  }
  ```
- **状态**：✅ 已修复

---

### 🔴 问题 2：`api.recommendParttime is not a function`

- **位置**：`parttime.js` 第 161 行
- **原因**：同上，未在 `api.js` 中导出
- **修复**：封装通用 `toggleModuleFavorite`：
  ```js
  async function recommendParttime(id) {
    return toggleModuleFavorite('parttime', id);
  }
  ```
- **状态**：✅ 已修复

---

### 🔴 问题 3：`api.createParttimePost is not a function`

- **位置**：`parttime.js` 第 191 行
- **原因**：同上，未在 `api.js` 中导出
- **修复**：封装通用 `createModulePost`，并做字段映射（`title/type/content` → 通用模块格式）：
  ```js
  async function createParttimePost(data) {
    const payload = {
      title: data.title,
      content: data.content || data.desc,
      type: data.type,
      tags: data.tags || [],
      images: data.images || [],
      price: data.salary,
      contact: data.contact || '',
    };
    return createModulePost('parttime', payload);
  }
  ```
- **状态**：✅ 已修复

---

### 🟡 问题 4：`parttime` 模块未在 `ALL_MODULES` 中注册

- **位置**：`api.js` 第 844 行
- **原因**：`ALL_MODULES` 数组包含 10 个模块，缺少 `'parttime'`，导致「我的发布」「我的收藏」聚合接口不包含兼职数据
- **修复**：末尾追加 `'parttime'`
- **状态**：✅ 已修复

---

### 🟡 问题 5：`MODULE_LABELS` 缺少中文名称映射

- **位置**：`api.js` 第 846 行
- **修复**：新增 `parttime: '兼职专区'`
- **状态**：✅ 已修复

---

## 二、仍需关注的问题（后端/架构层面）

### 🟠 问题 6：详情页 404 — `GET /api/module/parttime/p1 → 404`

- **位置**：`parttime.js` 第 88 行 → `detail.js` 第 57 行
- **触发路径**：
  1. 用户点击兼职条目
  2. `onItemTap` 跳转到 `/subpkg/detail/detail?module=parttime&id=p1`
  3. 共享详情页 `detail.js` 调用 `api.getModuleDetail('parttime', 'p1')`
  4. 请求 `GET https://{{DOMAIN}}/api/module/parttime/p1`
  5. 后端返回 **404**

- **根因**：后端 `{{DOMAIN}}` 的 `/api/module/*` 路由系统中，**不存在 `parttime` 这个模块**。后端仅支持以下模块：
  ```
  express, task, lost, secondhand, rental, substitute, print, yellowpage, bulletin, charity
  ```

- **当前表现**：点击兼职条目后，详情页白屏或显示"加载失败"

- **建议方案**（按推荐优先级）：

  | 方案 | 说明 | 改动量 |
  |------|------|--------|
  | **A. 后端新增 parttime 路由** | 在后端 NestJS 的 module 路由中注册 `parttime`，复用已有的通用模块 CRUD 逻辑 | 后端 1 个文件 |
  | B. 前端做降级处理 | 详情页检测到 `module=parttime` 时使用本地 DEFAULT_LIST 数据渲染，不请求后端 | 前端 detail.js |
  | C. 暂时移除详情页跳转 | 点击兼职条目不做跳转，或在 parttime 页面内做简易弹窗 | 前端 parttime.js |

- **推荐方案 A**：后端新增路由最彻底，且兼职模块的数据结构（title/desc/salary/tags）与通用模块的（title/content/price/tags）高度兼容

---

### 🟡 问题 7：本地降级数据的 `_id` 使用非标准格式

- **位置**：`parttime.js` 第 6-38 行
- **DEFAULT_LIST** 中的 `_id` 是 `"p1"`, `"p2"` 等自定义字符串，而后端 MongoDB 返回的是标准 ObjectId（如 `"507f1f77bcf86cd799439011"`）
- **影响**：
  - 如果后端开始返回真实数据，本地降级逻辑的 `item._id` 匹配会混乱
  - `onRecommend` 中的本地状态切换（`item._recommended`）在混合真实数据后会不一致
- **建议**：当后端 parttime 模块上线后，统一使用后端返回的 `_id`，移除本地 `DEFAULT_LIST`

---

### 🟡 问题 8：`onRecommend` 点赞逻辑的问题

- **位置**：`parttime.js` 第 147-162 行
- **问题**：
  1. 点赞提示固定显示"已推荐"，未区分推荐/取消推荐
  2. `api.recommendParttime(id)` 调用后不关心返回值（`.catch(() => {})`），请求失败用户无感知
  3. 本地状态 `_recommended` 为 `undefined` 时 `!hasRec` 永远是 `true`，初次点击一直是"推荐"方向，没问题但如果后端返回已推荐状态则不同步
- **建议**：根据 API 返回值更新状态，提示区分"已推荐"/"已取消"

---

## 三、修改清单

### `utils/api.js`（3 处修改）

| 修改内容 | 行号 | 类型 |
|----------|------|------|
| ALL_MODULES 追加 `'parttime'` | 844 | 数组追加 |
| MODULE_LABELS 追加 `parttime: '兼职专区'` | 850 | 对象追加 |
| 新增 3 个函数 `getParttimeList` / `createParttimePost` / `recommendParttime` | 1156-1177 | 新增 |
| module.exports 追加三个导出 | 1217-1218 | 导出追加 |

### `subpkg/life/parttime/parttime.js`

无需修改（原有代码在 API 函数可用后正常工作，降级逻辑也能正常 fallback）。

### 后端（建议）

需新增 `parttime` 模块路由，注册到 `/api/module/parttime/*` 下，复用已有通用模块 CRUD 中间件。

---

## 四、总结

| 类别 | 数量 | 状态 |
|------|------|------|
| 🔴 严重（函数未定义导致报错） | 3 | ✅ 已修复 |
| 🟡 中等（模块注册缺失） | 2 | ✅ 已修复 |
| 🟠 需关注（后端不支持的接口） | 1 | ⚠️ 需后端配合 |
| 🟡 设计问题 | 2 | 📝 已记录建议 |

前端已修复的部分下次编译即可生效。后端需要新增 `parttime` 模块路由才能让详情页正常工作。
