import assert from "node:assert/strict";
import { acceptDirectoryPayload, forumReturnUrl } from "./knowledge-directory";

const cards = acceptDirectoryPayload({
  data: {
    items: [
      {
        globalId: "com_abc",
        slug: "beijing",
        name: "北京",
        description: "公开",
        canonicalUrl: "https://knowledge.example/c/beijing",
        visibility: "PUBLIC",
        discovery: "SEARCHABLE",
      },
      {
        globalId: "com_secret",
        slug: "secret",
        name: "秘密圈",
        description: "不能出现",
        canonicalUrl: "https://knowledge.example/c/secret",
        visibility: "PRIVATE",
        discovery: "HIDDEN",
      },
      { name: "缺字段" },
    ],
  },
});

assert.deepEqual(cards.map((item) => item.slug), ["beijing"]);
for (const canonicalUrl of ["https://", "http://[invalid", "javascript:alert(1)", "https://user:password@knowledge.example/c/test"]) {
  const invalid = acceptDirectoryPayload({ data: { items: [{ globalId: "com_invalid", slug: "invalid", name: "Invalid", visibility: "PUBLIC", discovery: "SEARCHABLE", canonicalUrl }] } });
  assert.deepEqual(invalid, [], canonicalUrl);
}
assert.equal(
  forumReturnUrl("https://knowledge.example/c/beijing"),
  "https://knowledge.example/c/beijing?from=forum&returnTo=%2Fforum%2Fcommunities",
);
console.log("knowledge directory tests passed");
