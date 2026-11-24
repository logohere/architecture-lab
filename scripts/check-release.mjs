import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export function validateRelease(version, changelog, ref = "") {
  if (!ref.startsWith("refs/tags/")) return;
  const expected = `refs/tags/v${version}`;
  if (ref !== expected) throw new Error(`Release tag must be ${expected}; got ${ref}`);
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!new RegExp(`^## \\[${escaped}\\] - \\d{4}-\\d{2}-\\d{2}\\s*$`, "m").test(changelog)) {
    throw new Error(`Missing dated changelog heading for ${version}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const metadata = JSON.parse(execFileSync("cargo", ["metadata", "--locked", "--format-version", "1"], { encoding: "utf8" }));
  const root = metadata.packages.find((pkg) => pkg.id === metadata.resolve?.root);
  if (!root) throw new Error("Missing root package in Cargo metadata");
  validateRelease(root.version, readFileSync("CHANGELOG.md", "utf8"), process.env.GITHUB_REF);
  console.log(`Release metadata valid: ${root.version}`);
}
