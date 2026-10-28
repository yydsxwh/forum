# 校园参考源码导入说明

导入日期：2026-10-28。

本分支 `codex/campus-source-analysis-20261028` 从 `forum/main` 的 `98485b63e354694965d74b9c533521cda0eed208` 建立，仅增加参考源码和分析文档。没有修改原论坛业务，没有合并独立运行候选，没有运行应用、导入数据库或部署。

## 目录

- `references/campus-service/`：706 个原始文件与 `IMPORT-MANIFEST.json`；原始文件字节保持一致。
- `docs/campus-integration/校园小程序完整源码分析报告.pdf`：完整阅读报告，含功能、架构、数据库、18组问题、原论坛保留及融合建议。
- `docs/campus-integration/Cursor-论坛融合开发提示词.md`：可直接交给 Cursor 的30项功能台账、18组修复要求与54条验收清单。
- `docs/campus-integration/source-inventory.json`：静态数量、页面/相对引用检查、SQL表名及排除项；不代表运行测试通过。

## 上传排除

原始文件715个；上传原始文件706个，7,027,098字节。以下9项未上传：

- `backend/.env`：本地环境配置。
- 两处 `project.private.config.json`：开发者私有配置。
- `backend/admin/calendar.html`、`calendar-h5.html`、`calendar-preview.html`、`calendar-preview2.html`、`calendar-preview3.html`、`styles.css.v14-bloated`：原项目忽略的历史预览/备份。

原ZIP包含被排除配置，不上传ZIP。保留 `.env.example`、图片与地图等业务参考资产。有限格式密钥扫描没有命中指定模式，不是无敏感信息的全面保证。

## 如何给 Cursor 使用

不能从本资料分支重建业务主干。请在实际论坛业务分支中先取本分支的 `references/campus-service` 和 `docs/campus-integration` 路径，再完整执行MD。按当前代码和PR重新确认基线。

本次核对：`forum/main`仅README；`cursor/andyyyds-forum-port-ec0d`（`ba723b4c1879d461f7f0a565c941c25fb5196f63`）为PR #1独立运行草稿候选；其 `packages/forum` 与主站 `Andyyyds/Andyyyds20260901independentpackage`（`8c2ab6c4767f9dacc3a4c1b110fb53fe8fbbda1a`）对应文件blob一致。此事实不表示生产已迁移。

## 来源与授权

原README标注商业交付源码；保留原文件及授权说明。本次导入不新增开源许可证，也不改变原协议或素材授权。参考源码没有在本次得到业务修复，不能直接作为生产可运行保证。

## 复核

`IMPORT-MANIFEST.json`记录每个被导入原始文件的相对路径、大小和SHA-256，以及排除理由。统计与静态检查可复核；真正的编译、数据库、权限、并发、联调和上线验收由Cursor后续执行。
