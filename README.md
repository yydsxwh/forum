# Andyyyds 论坛

从 [yydsxwh/Andyyyds](https://github.com/yydsxwh/Andyyyds) 搬过来的论坛产品。源码在 `packages/forum`，站点路由仍走 `/forum`。

## 功能

- 大学校园、兴趣圈子、同城、机构四类空间
- 分区发帖、评论、点赞 / 收藏 / 关注
- 图片视频上传、地点、分享
- 学生认证与论坛后台（`/studio/forum`）
- 登录注册（与 Andyyyds 同一套账号体系）

首页 `/` 会跳到 `/forum`。

## 本地运行

```bash
cp .env.example .env
npm install
npm run db:reset
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)

### 演示账号

| 角色 | 登录账号 | 邮箱 | 密码 |
|------|----------|------|------|
| 管理员 | `andy` | admin@yyds.local | 123456 |
| 讲师 | `teacher` | teacher@yyds.local | 123456 |
| 学员 | `student` | student@yyds.local | 123456 |

## 目录

- `packages/forum` 论坛页面、接口和业务
- `packages/shared` 登录、存储、权限等公共能力
- `packages/meetup` 发帖选点用地图组件
- `src/app/forum`、`src/app/api/forum` 路由薄入口
- `prisma` 数据模型与种子（含论坛空间表）
