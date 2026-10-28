# Reddit 能力对照

正文在 Knowledge 仓库，避免两份表各写各的：

`https://github.com/yydsxwh/knowledge/blob/cursor/unified-community-knowledge-0949/docs/REDDIT-FEATURE-MATRIX.md`

Forum 这次只增加公开目录适配：`packages/forum/lib/knowledge-directory.ts` 和 `/forum/communities`。私密社区即使出现在响应里也会被丢掉。独立 Forum 进程没有接到线上 `/forum`，因为那条路径仍由主站写入。
