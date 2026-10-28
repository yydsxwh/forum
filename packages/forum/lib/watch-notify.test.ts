import assert from "node:assert/strict";

import { watcherIdsToNotify } from "./watch-recipients";

const ids = watcherIdsToNotify({
  subscriptions: [
    { userId: "a", enabled: true },
    { userId: "b", enabled: false },
  ],
  legacyUserIds: ["a", "b", "author"],
  authorId: "author",
});
assert.deepEqual(ids, ["a"]);
assert.notEqual("forum-reply:c1:a", "forum-reply:c1:author");
console.log("watch recipient tests passed");
