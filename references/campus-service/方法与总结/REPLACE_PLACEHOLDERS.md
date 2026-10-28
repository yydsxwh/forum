# 部署前请替换以下占位符

本源码在交付前已对个人与学校相关信息做脱敏处理，所有敏感值均替换为 `{{...}}` 占位符。
部署到你自己的环境前，请全文搜索 `{{` 并替换为你的实际配置。**请勿将这些占位符留空或保留示例值上线。**

| 占位符 | 含义 | 示例 |
|--------|------|------|
| `{{DOMAIN}}` | 你的生产域名（所有 `https://{{DOMAIN}}` 引用一并替换） | `your-campus-app.com` |
| `{{OLD_DOMAIN}}` | 旧域名占位（可忽略或删除） | — |
| `{{BRAND}}` | 品牌/项目标识 | `campus` |
| `{{PM2_PROCESS_NAME}}` | PM2 进程名 | `campus-server` |
| `{{SERVER_IP}}` | 服务器公网 IP | `0.0.0.0` |
| `{{JWT_SECRET}}` | JWT 签名密钥，请用随机长字符串 | `openssl rand -hex 32` |
| `{{WECHAT_APPID}}` | 微信小程序 AppID | `wx........` |
| `{{WECHAT_SECRET}}` | 微信小程序 AppSecret | — |
| `{{DB_PASSWORD}}` | 数据库密码 | — |
| `{{DEVELOPER_PHONE}}` | 隐私保护指引中的开发者联系手机号 | — |
| `{{DEVELOPER_EMAIL}}` | 开发者反馈邮箱 | — |
| `{{USER_HOME}}` | 本地项目路径前缀 | `/home/developer` |
| `{{SCHOOL_NAME}}` | 学校名称 | — |
| `{{SCHOOL_EMAIL_DOMAIN}}` | 学校邮箱域名 | — |
| `{{SCHOOL_ADDRESS}}` | 学校地址 | — |
| `{{SCHOOL_HOSPITAL_ADDRESS}}` | 附属医院地址 | — |
| `{{SCHOOL_CITY}}` | 学校所在城市 | — |
| `{{SCHOOL_AREA_CODE}}` | 学校所在地区号 | — |
| `{{BRAND_NAME}}` | 产品版权 / 品牌署名（原开发者个人署名，已脱敏） | `CampusHub` |
| `{{WECHAT_TEMPLATE_ID}}` | 微信订阅消息模板 ID（需在你自己的小程序后台申请） | — |
| `{{SCHOOL_OFFICIAL_WECHAT}}` | 校园黄页中「学校官方微信」 | — |
| `{{SCHOOL_QQ_GROUPS}}` | 校园黄页中「学校官方 QQ 群」 | — |
| `{{DEMO_CONTACT}}` | H5 演示页中的示例联系方式 | — |
| `{{TREEHOLE_PASSWORD}}` | 树洞管理后台密码（见 backend/.env 的 TREEHOLE_ADMIN_PASSWORD） | 强密码 |

> **默认管理员账号**：`admin` / 默认密码 `Admin@123456`（bcrypt 哈希已直接写入 `backend/schema.sql` 的 `admins` 表，建库后即可用该账号密码登录管理端，**开箱即用**）。
> 出于安全，**上线前请务必修改默认密码**（可在管理端「系统设置 / 管理员」中修改，或重新生成哈希替换 `schema.sql` 中的值）：
> ```bash
> cd backend && npm i bcryptjs
> node -e "console.log(require('bcryptjs').hashSync('你的新强密码', 14))"
> ```

## 其他交付注意事项
- 源码目录下的 `.git`（版本历史）和 `node_modules/`（依赖）**不应**随源码一并发出：历史中可能残留早期密钥，依赖可让买家自行 `npm install`。
- 微信小程序 `project.config.json` 中的 `appid` 已替换为占位符，买家需填入自己的小程序 AppID。
- `backend/.env` 为敏感配置文件，已用占位符脱敏，买家需将所有 `{{...}}` 替换为真实值后使用。
