import Link from "next/link";
import { NavPageTemplateShell } from "@/components/nav-page-template-shell";
import { fetchKnowledgeDirectory, forumReturnUrl } from "@andyyyds/forum/lib/knowledge-directory";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "知识社区",
  description: "和论坛共用同一套社区身份。讨论留在论坛，会员和资料在知识社区。",
};

export default async function ForumKnowledgePage() {
  const directory = await fetchKnowledgeDirectory();
  return (
    <NavPageTemplateShell type="forum">
      <div className="container space-y-6 py-10 sm:py-12">
        <header className="space-y-2">
          <p className="text-sm font-medium text-[var(--brand)]">论坛 · 知识社区</p>
          <h1 className="text-3xl font-semibold">同一个圈子，两个入口</h1>
          <p className="max-w-2xl text-sm leading-7 text-[var(--muted)]">
            成员、付费和资料以知识社区为准。这里只展示可检索的公开社区，私密圈子不会出现在目录里。
          </p>
          <Link href="/forum" className="btn btn-secondary inline-flex min-h-11 items-center px-4 text-sm">
            返回论坛分区
          </Link>
        </header>
        {directory.ok ? null : (
          <p className="rounded-[28px] border border-[var(--line)] p-5 text-sm leading-7">
            {directory.reason === "unconfigured"
              ? "知识社区目录还没有接上。配置 KNOWLEDGE_API_URL 后，这里会列出公开社区。"
              : "知识社区暂时连不上。论坛分区仍可使用，请稍后再试。"}
          </p>
        )}
        {directory.ok && directory.items.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">知识社区里还没有可公开展示的圈子。</p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          {directory.items.map((item) => (
            <a key={item.globalId} href={forumReturnUrl(item.canonicalUrl)} className="surface block rounded-[28px] p-5">
              <h2 className="text-xl font-semibold">{item.name}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.description}</p>
              <p className="mt-4 text-xs text-[var(--muted)]">{item.globalId}</p>
            </a>
          ))}
        </div>
      </div>
    </NavPageTemplateShell>
  );
}
