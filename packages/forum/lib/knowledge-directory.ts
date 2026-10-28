export type KnowledgeCard = {
  globalId: string;
  slug: string;
  name: string;
  description: string;
  canonicalUrl: string;
};

export function acceptDirectoryPayload(payload: unknown): KnowledgeCard[] {
  if (!payload || typeof payload !== "object" || !("data" in payload)) return [];
  const data = (payload as { data?: { items?: unknown } }).data;
  const items = data && Array.isArray(data.items) ? data.items : [];
  const cards: KnowledgeCard[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (row.visibility !== "PUBLIC" || row.discovery !== "SEARCHABLE") continue;
    if (typeof row.globalId !== "string" || typeof row.slug !== "string" || typeof row.name !== "string") continue;
    if (typeof row.canonicalUrl !== "string") continue;
    if (!row.canonicalUrl.startsWith("https://") && !row.canonicalUrl.startsWith("http://")) continue;
    cards.push({
      globalId: row.globalId,
      slug: row.slug,
      name: row.name.slice(0, 80),
      description: typeof row.description === "string" ? row.description.slice(0, 280) : "",
      canonicalUrl: row.canonicalUrl,
    });
  }
  return cards;
}

export function forumReturnUrl(canonicalUrl: string, returnTo = "/forum/communities") {
  const url = new URL(canonicalUrl);
  url.searchParams.set("from", "forum");
  url.searchParams.set("returnTo", returnTo);
  return url.toString();
}

export async function fetchKnowledgeDirectory(input: { apiUrl?: string; timeoutMs?: number } = {}) {
  const apiUrl = (input.apiUrl ?? process.env.KNOWLEDGE_API_URL ?? "").replace(/\/$/, "");
  if (!apiUrl) return { ok: false as const, reason: "unconfigured" as const, items: [] as KnowledgeCard[] };
  try {
    const response = await fetch(`${apiUrl}/api/v1/bridge`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(input.timeoutMs ?? 3000),
      cache: "no-store",
    });
    if (!response.ok) return { ok: false as const, reason: "unavailable" as const, items: [] as KnowledgeCard[] };
    return { ok: true as const, reason: "ok" as const, items: acceptDirectoryPayload(await response.json()) };
  } catch {
    return { ok: false as const, reason: "unavailable" as const, items: [] as KnowledgeCard[] };
  }
}
