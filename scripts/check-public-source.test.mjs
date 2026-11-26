import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { findings } from "./check-public-source.mjs";

const slash = "/";
const backslash = String.fromCharCode(92);
const home = slash + ["home", "fictional-user", "project"].join(slash);
const windows = "X:" + backslash + ["fictional-user", "project"].join(backslash);
const share = backslash.repeat(2) + ["fictional-host", "share"].join(backslash);
const key = "-----BEGIN " + "PRIVATE KEY-----";

test("detects private-path patterns without recording real machine values", () => {
  assert.deepEqual(findings(home), ["personal home path"]);
  assert.deepEqual(findings(windows), ["absolute Windows path"]);
  assert.deepEqual(findings(share), ["Windows network share"]);
  assert.deepEqual(findings(key), ["private key"]);
  assert.deepEqual(findings("src/lib.rs https://example.org/repo HOME USERPROFILE"), []);
});

test("checks the staged index and emits only generic diagnostics", () => {
  const root = mkdtempSync(join(tmpdir(), "archlab-source-test-"));
  const checker = resolve("scripts/check-public-source.mjs");
  try {
    const git = (...args) => execFileSync("git", args, { cwd: root });
    git("init", "-q", "--template=");
    const file = join(root, "notes.txt");
    const check = () => spawnSync(process.execPath, [checker], { cwd: root, encoding: "utf8" });
    writeFileSync(file, "relative/path");
    git("add", "notes.txt");
    assert.equal(check().status, 0);
    writeFileSync(file, home);
    assert.equal(check().status, 0, "unstaged content does not enter a commit");
    git("add", "notes.txt");
    const result = check();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /personal home path/);
    assert.ok(!result.stderr.includes(home));
    assert.ok(!result.stderr.includes("notes.txt"));
    assert.ok(!result.stderr.includes(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
