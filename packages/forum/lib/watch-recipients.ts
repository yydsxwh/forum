export type WatcherRef = { userId: string; enabled: boolean };

/** 取消蹲的人即使还留着旧的点赞式关注，也不再通知。作者不通知自己。 */
export function watcherIdsToNotify(input: {
  subscriptions: WatcherRef[];
  legacyUserIds: string[];
  authorId: string;
}) {
  const disabled = new Set(input.subscriptions.filter((item) => !item.enabled).map((item) => item.userId));
  const ids = new Set<string>();
  for (const item of input.subscriptions) {
    if (item.enabled) ids.add(item.userId);
  }
  for (const userId of input.legacyUserIds) {
    if (!disabled.has(userId)) ids.add(userId);
  }
  ids.delete(input.authorId);
  return [...ids];
}
