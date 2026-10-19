/**
 * 新评论通知蹲贴的人。作者自己的评论不通知自己。
 * 站内通知先落库；微信失败不能把评论回滚掉。
 */

import { prisma } from "@andyyyds/shared/db";
import { watcherIdsToNotify } from "./watch-recipients";

export async function notifyForumReply(input: {
  postId: string;
  commentId: string;
  authorId: string;
  postTitle: string;
  excerpt: string;
  linkUrl: string;
}) {
  const [subscriptions, legacy] = await Promise.all([
    prisma.watchSubscription.findMany({
      where: { resourceType: "FORUM_POST", resourceId: input.postId },
      select: { userId: true, enabled: true },
    }),
    prisma.forumAction.findMany({ where: { postId: input.postId, type: "WATCH" }, select: { userId: true } }),
  ]);
  const userIds = watcherIdsToNotify({
    subscriptions,
    legacyUserIds: legacy.map((item) => item.userId),
    authorId: input.authorId,
  });
  const title = input.postTitle.trim().slice(0, 40) || "论坛帖子";
  const excerpt = input.excerpt.trim().slice(0, 40);
  for (const userId of userIds) {
    const dedupeKey = `forum-reply:${input.commentId}:${userId}`;
    await prisma.siteNotification.create({
      data: {
        userId,
        event: "FORUM_REPLY_CREATED",
        title: "你蹲的帖子有新评论",
        body: `${title}：${excerpt}`,
        linkUrl: input.linkUrl,
        dedupeKey,
      },
    }).catch((error: { code?: string }) => {
      if (error.code !== "P2002") throw error;
    });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { accountSub: true } });
    if (!user?.accountSub) continue;
    void sendForumWechat({
      eventId: dedupeKey,
      recipientUserSub: user.accountSub,
      templateData: { postTitle: title, commentExcerpt: excerpt, occurredAt: new Date().toISOString().slice(0, 16).replace("T", " ") },
      webUrl: input.linkUrl,
    }).catch(() => undefined);
  }
}

async function sendForumWechat(input: {
  eventId: string;
  recipientUserSub: string;
  templateData: Record<string, string>;
  webUrl: string;
}) {
  const base = (process.env.PLATFORM_BASE_URL || process.env.PLATFORM_API_URL || "").trim().replace(/\/+$/, "");
  const token = (process.env.PLATFORM_SERVICE_TOKEN || "").trim();
  if (!base || !token) return;
  await fetch(`${base}/v1/notifications/send`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "x-platform-client": process.env.PLATFORM_CLIENT_ID || "andyyyds",
    },
    body: JSON.stringify({
      eventId: input.eventId,
      productId: "main",
      eventType: "FORUM_REPLY_CREATED",
      recipientUserSub: input.recipientUserSub,
      requestedChannels: ["WECHAT"],
      priority: "NORMAL",
      privacyClass: "NORMAL",
      audience: "WATCHER",
      templateData: input.templateData,
      webUrl: input.webUrl.startsWith("/") ? undefined : input.webUrl,
      dedupeKey: input.eventId,
      respectPreferences: true,
    }),
    signal: AbortSignal.timeout(8_000),
  });
}

export async function setForumWatch(userId: string, postId: string, enabled: boolean) {
  await prisma.watchSubscription.upsert({
    where: { userId_resourceType_resourceId: { userId, resourceType: "FORUM_POST", resourceId: postId } },
    create: { userId, resourceType: "FORUM_POST", resourceId: postId, enabled, channels: "IN_APP,WECHAT" },
    update: { enabled },
  });
  await prisma.siteAuditLog.create({
    data: {
      actorId: userId,
      action: enabled ? "WATCH_SUBSCRIBED" : "WATCH_UNSUBSCRIBED",
      entityType: "FORUM_POST",
      entityId: postId,
    },
  });
}
