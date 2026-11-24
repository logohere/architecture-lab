import { test } from "node:test";
import assert from "node:assert/strict";
import { validateRelease } from "./check-release.mjs";

test("ordinary development does not require a release heading", () => {
  assert.doesNotThrow(() => validateRelease("0.1.0", "## Unreleased", "refs/heads/main"));
});

test("matching tag and dated heading pass", () => {
  assert.doesNotThrow(() => validateRelease("0.1.0", "## [0.1.0] - 2026-11-24\n", "refs/tags/v0.1.0"));
  assert.doesNotThrow(() => validateRelease("0.2.0-alpha.1", "## [0.2.0-alpha.1] - 2026-11-24\n", "refs/tags/v0.2.0-alpha.1"));
});

test("mismatched tags or missing dated release notes fail", () => {
  assert.throws(() => validateRelease("0.1.0", "## [0.1.0] - 2026-11-24", "refs/tags/v0.1.1"), /Release tag/);
  assert.throws(() => validateRelease("0.1.0", "## Unreleased", "refs/tags/v0.1.0"), /Missing dated/);
  assert.throws(() => validateRelease("0.1.0", "## [0x1x0] - 2026-11-24", "refs/tags/v0.1.0"), /Missing dated/);
});
