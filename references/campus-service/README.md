# 校园综合服务平台

> 一套**完整可上线**的校园生活服务微信小程序源码，包含：微信小程序前端 + Node.js 后端 + 网页管理后台 + H5 移动端。
> 以「拼车出行」为核心，扩展 **12 个校园生活模块**，内置用户系统、信用分、实时私信/群聊、内容风控与管理后台。

---

## 一、项目简介

本项目是一套面向高校的校园综合服务小程序。学生可发布/加入拼车、使用快递代取、二手交易、失物招领、校园论坛、树洞等模块，并在统一的信用分体系下互相评价。配套管理后台支持用户管理、内容审核、投诉处理、风控与运营统计。

源码已对个人与学校相关信息做脱敏处理，所有敏感配置均以 `{{...}}` 占位符形式保留，部署前需替换为你的实际值（见下文「配置占位符」）。

---

## 二、功能特性

### 核心功能：拼车出行
- 发布拼车（出发地 / 目的地 / 时间 / 人数 / 费用）
- 同行大厅：浏览、搜索、筛选拼车信息
- 申请加入、管理同行成员
- 完成后互相评价（信用分机制）
- 热门路线推荐、出行偏好标签（抽烟 / 听歌 / 聊天 / 安静 / 宠物 / 行李）

### 12 个校园生活模块
| 模块 | 标识 | 说明 |
|------|------|------|
| 快递代取 | express | 代拿 / 代寄快递 |
| 悬赏任务 | task | 找人帮忙、悬赏代办 |
| 失物招领 | lost | 拾到 / 丢失物品发布 |
| 校园论坛 | forum | 校园话题讨论 |
| 二手交易 | secondhand | 二手物品买卖 |
| 闲置租赁 | rental | 物品租借 / 短租 |
| 代课代跑 | substitute | 代课、代跑腿 |
| 打印服务 | print | 打印 / 复印代办 |
| 校园黄页 | yellowpage | 校园服务电话本 |
| 公告板 | bulletin | 活动公告 / 通知 |
| 公益捐赠 | charity | 闲置物品捐赠 |
| 树洞 | treehole | 匿名倾诉 |

### 用户系统
- 微信一键登录 / 手机号验证码登录 / 密码登录
- 个人资料（头像、昵称、学校、院系、年级、学号）
- 信用分机制（初始 100，发布 +5、参与 +2、好评 +3、差评 -5、爽约 -10）
- 实时私信、基于拼车的群聊
- 投诉 / 反馈 / 联系我们

### 管理后台（Web）
- 数据概览仪表盘
- 用户管理（搜索、封禁、解封）
- 拼车 / 公告 / 帖子管理
- 投诉处理、反馈管理、评价管理
- 聊天记录查看、操作日志
- IP 风控、敏感词管理

---

## 三、技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 后端框架 | Node.js + Express.js | 4.x |
| 数据库 | MySQL | 5.7+ |
| 认证 | JWT（jsonwebtoken + bcryptjs） | 9.x |
| 小程序 | 微信小程序原生框架 | WXML + WXSS |
| H5 前端 | 单文件 HTML / CSS / JS SPA | — |
| 管理后台 | 原生 HTML / CSS / JS SPA（ES Modules） | — |
| 部署 | PM2 + Nginx 反向代理 | — |
| SSL | Let's Encrypt（certbot） | — |

### 后端主要依赖
express · mysql2 · jsonwebtoken · bcryptjs · multer · helmet · cors · morgan · express-rate-limit · express-validator · axios · dayjs · dotenv

---

## 四、目录结构

```
项目根目录/
├── README.md                       # 本文档
├── deploy-achievement.sh           # 校园成就功能部署脚本
├── deploy-treehole.sh              # 树洞功能部署脚本
├── 方法与总结/                     # 开发参考文档
│   ├── README.开发文档.md          # 更详细的技术 / 开发参考
│   ├── REPLACE_PLACEHOLDERS.md     # 占位符清单与替换说明（必读）
│   ├── 部署流程.md                 # 按步骤操作的快速部署清单
│   └── 微信订阅消息通知接入指南.md  # 订阅消息接入
├── backend/                        # 后端服务
│   ├── .env.example                # 环境变量模板（部署时 cp 为 .env）
│   ├── install.sql                 # 一键建库脚本（含全部表与种子数据）
│   ├── schema.sql                  # MySQL 建表脚本（核心表）
│   ├── schema-module.sql           # 模块系统建表脚本
│   ├── schema-treehole.sql         # 树洞模块建表
│   ├── schema-new-tables.sql       # 新增表（成就等）
│   ├── schema-canteen.sql          # 食堂模块建表
│   ├── schema-map-pois.sql         # 地图 POI 建表
│   ├── seed-new-tables.sql         # 种子数据
│   ├── admin/                      # 管理后台 SPA（index.html 等）
│   ├── uploads/                    # 用户上传目录
│   └── src/                        # 后端源码
│       ├── app.js                  # Express 主入口
│       ├── config/                 # 数据库等配置
│       ├── middleware/             # 认证 / 权限 / 隐私脱敏 / 限流
│       ├── models/                 # 数据模型（自研 QueryBuilder）
│       ├── controllers/            # 控制器（业务逻辑）
│       ├── routes/                 # 路由
│       └── services/               # 服务层（统计 / 风控 / 短信 / 微信推送）
│
├── mini-program/                   # 微信小程序
│   ├── project.config.json         # 开发者工具项目配置（appid 已脱敏）
│   ├── API接口文档.md              # API 接口详细文档
│   ├── 隐私保护指引.txt            # 隐私保护指引（联系方式已脱敏）
│   ├── scripts/                    # 页面生成脚本
│   └── miniprogram/                # 小程序主体
│       ├── app.js / app.json       # 入口与全局配置
│       ├── utils/api.js            # API 封装（REST 客户端）
       ├── components/             # 复用组件
│       ├── pages/                  # 主包页面
│       ├── subpkg/                 # 分包页面（12 模块）
│       └── images/                 # 图片资源
```

---

## 五、环境要求

- Node.js 18+
- MySQL 5.7+
- 微信开发者工具（用于小程序调试 / 预览）
- 一台可公网访问的服务器（部署阶段，可选）

---

## 六、快速开始（本地开发）

### 1. 初始化数据库
```bash
mysql -u root -p < backend/schema.sql
mysql -u root -p < backend/schema-module.sql
```

### 2. 配置后端环境变量
```bash
cd backend
cp .env.example .env
# 编辑 .env，至少填写：MYSQL_PASSWORD、JWT_SECRET、WECHAT_APPID、WECHAT_SECRET
```

### 3. 安装依赖并启动后端
```bash
npm install
npm run dev      # 开发模式（nodemon 热重载）
# 或
npm start        # 生产模式
```
后端默认运行在 `http://localhost:3000`，健康检查：`GET /api/health`

### 4. 小程序开发
```text
用「微信开发者工具」打开 mini-program/ 目录，
在 project.config.json 中填入你自己的小程序 AppID，
并将 miniprogram/utils/api.js 中的 API 地址指向本地后端。
```

### 5. 管理后台
浏览器访问 `http://localhost:3000/admin`

---

## 七、API 概览

所有接口前缀为 `/api`，鉴权方式：
```
Authorization: Bearer <JWT_TOKEN>
```

| 路由 | 说明 | 认证 |
|------|------|------|
| /api/auth | 登录 / 注册 / Token | 部分 |
| /api/user | 用户资料 / 搜索 / 统计 | JWT |
| /api/carpools | 拼车 CRUD | JWT |
| /api/messages · /api/messages/enhanced | 私信 / 群聊 / 在线状态 | JWT |
| /api/notifications | 通知 | JWT |
| /api/reviews | 评价 | JWT |
| /api/upload | 文件上传 | JWT |
| /api/feedback · /api/announcements · /api/complaints | 反馈 / 公告 / 投诉 | JWT |
| /api/recommend · /api/contact | 热门推荐 / 联系我们 | 无 |
| /api/module · /api/remarks | 模块帖子（12 模块统一）/ 备注 | JWT |
| /api/admin | 管理后台全部功能 | 管理员 |
| /api/health | 健康检查 | 无 |

更详细的字段说明见 `mini-program/API接口文档.md`。

---

## 八、数据库

共 **21 张表**，分为：
- **核心业务表**：users · carpools · carpool_participants · messages · notifications · reviews · complaints · complaint_timeline · feedbacks · announcements · favorites
- **模块系统表**：module_posts · module_favorites · module_replies
- **辅助表**：admins · sensitive_words · ip_records · hot_routes · daily_stats · operation_logs · sms_codes · contact_messages

> 建库请用合并脚本 `backend/install.sql`（`mysql -u root -p < backend/install.sql` 一键建库，已含全部表结构与种子数据）。
> 默认超级管理员账号：`admin` / 默认密码 `Admin@123456`（已写入 `install.sql`，建库后即可直接登录；**上线前务必修改为强密码**）。

---

## 九、配置占位符（部署前必读）

源码中所有敏感 / 个性化信息均已替换为 `{{...}}` 占位符，**部署到你的环境前必须全文替换**：

- `{{DOMAIN}}` — 你的生产域名
- `{{SCHOOL_NAME}}` / `{{SCHOOL_CITY}}` / `{{SCHOOL_ADDRESS}}` / `{{SCHOOL_EMAIL_DOMAIN}}` / `{{SCHOOL_AREA_CODE}}` — 学校相关信息
- `{{WECHAT_APPID}}` / `{{WECHAT_SECRET}}` — 微信小程序凭证
- `{{JWT_SECRET}}` / `{{DB_PASSWORD}}` — 密钥与数据库密码
- `{{SERVER_IP}}` / `{{USER_HOME}}` — 服务器与本地路径
- `{{DEVELOPER_PHONE}}` / `{{DEVELOPER_EMAIL}}` — 隐私保护指引中的联系方式

完整清单与填写示例见 **`REPLACE_PLACEHOLDERS.md`**。

---

## 十、部署说明

- **`方法与总结/部署流程.md`** — 按步骤操作的快速部署清单（推荐先看这份）；
- **`方法与总结/README.开发文档.md`** — 更详细的技术参考（含 Nginx 反向代理、PM2 进程管理、HTTPS 证书、数据库备份等）。

通用流程：
1. 服务器安装 Node.js + MySQL + Nginx；
2. 上传 `backend/` 并 `npm install --production`；
3. 创建数据库并导入 `schema.sql` / `schema-module.sql`；
4. 配置 `.env`（替换全部占位符）；
5. 用 PM2 启动，配置 Nginx 反向代理与 HTTPS；
6. 微信开发者工具上传小程序，填入你的 AppID。

---

## 十一、许可证

本仓库为**商业交付源码**，随项目整体转让。具体授权范围、是否允许转售 / 二开，以买卖双方签署的协议为准。

---

## 十二、相关文档

- `方法与总结/REPLACE_PLACEHOLDERS.md` — 占位符清单与替换说明（**部署前必读**）
- `方法与总结/部署流程.md` — 按步骤操作的快速部署清单
- `方法与总结/README.开发文档.md` — 更完整的技术 / 开发参考文档
- `方法与总结/小程序修改工作流程.md` — 小程序修改参考（可喂给 AI）
- `mini-program/API接口文档.md` — API 接口详细文档
- `方法与总结/微信订阅消息通知接入指南.md` — 微信订阅消息接入
