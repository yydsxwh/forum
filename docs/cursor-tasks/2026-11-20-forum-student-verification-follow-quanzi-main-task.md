# 旧论坛代码执行入口：学校实名认证修复（2026-11-20）

**唯一需求正文（必须完整阅读，禁止只根据本指引施工）：**

https://github.com/yydsxwh/quanzi/blob/main/docs/cursor-tasks/2026-11-20-forum-school-verification-proof-recovery-search-pagination-hangzhou.md

任务 ID：QUANZI-FORUM-VERIFY-MIGRATION-20261120。

当前源代码定位线索（须先核实生产版本与路由）：
- packages/forum/components/studio-forum-verify-panel.tsx（与用户截图文字相对应）
- packages/forum/routes/studio/forum/page.tsx（现存 take: 80）
- packages/forum/api/studio/forum/verifications/route.ts（现存 take: 80，尚无完整搜索/分页）
- packages/forum/api/studio/forum/verifications/[id]/proof/route.ts
- packages/forum/lib/forum-verify-proof.ts
- packages/forum/api/studio/forum/verifications/[id]/route.ts
- packages/forum/components/forum-school-verify-form.tsx

执行约束：先定位当前杭州真正在线的论坛进程/代码，再修图片缺失、旧文件恢复与权限问题；按唯一任务正文补齐新标签独立详情、精确模糊查询、服务端分页跳页和真实验收。不得只改旧 forum 而遗漏正在统一的 quanzi；也不得只改尚未对外服务的 quanzi 而把线上破图留着。保留原服务器、旧数据与杭州后续新增数据，以增量和证据驱动迁移。

本文件是指向统一圈子仓库的最短入口，不是第二份互相冲突的需求正文；仅提交指引不等于已修改代码或已部署。
