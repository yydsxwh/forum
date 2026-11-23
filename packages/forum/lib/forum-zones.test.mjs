import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));

const source = readFileSync(join(dir, "forum.ts"), "utf8");
const block = source.match(/export const DEFAULT_FORUM_ZONES[\s\S]*?\n\];/);
assert.ok(block, "DEFAULT_FORUM_ZONES is missing");
const zones = [...block[0].matchAll(/key: "([^"]+)", name: "([^"]+)"/g)].map((item) => ({
  key: item[1],
  name: item[2],
}));
assert.deepEqual(
  zones.map((zone) => zone.key),
  ["daily", "food", "courses", "secondhand", "errand", "lostfound", "materials", "dating"],
);
assert.equal(zones.find((zone) => zone.key === "lostfound")?.name, "寻物招领");
assert.equal(new Set(zones.map((zone) => zone.key)).size, zones.length);

const space = readFileSync(join(dir, "forum-space.ts"), "utf8");
assert.match(space, /return DEFAULT_FORUM_ZONES;/);
assert.doesNotMatch(space, /lostfound/);
