import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
let commit = process.env.GITHUB_SHA || process.env.RELEASE_COMMIT || null;
let dirty = null;
try {
  commit ||= execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  dirty = Boolean(
    execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim()
  );
} catch {
  /* Hosting may build without Git metadata; do not invent a revision. */
}
mkdirSync("dist", { recursive: true });
writeFileSync(
  "dist/release.json",
  JSON.stringify({ commit, dirty, builtAt: new Date().toISOString() })
);
