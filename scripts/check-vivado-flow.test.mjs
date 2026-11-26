import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";

const harness = resolve("scripts/test-vivado-flow.tcl");
const fixture = (fn) => {
  const root = mkdtempSync(join(tmpdir(), "archlab-vivado-test-"));
  try {
    const home = join(root, "home");
    const flow = join(root, "fpga", "vivado", "ooc.tcl");
    mkdirSync(home);
    mkdirSync(join(root, "fpga", "vivado"), { recursive: true });
    mkdirSync(join(root, "rtl"));
    copyFileSync("fpga/vivado/ooc.tcl", flow);
    copyFileSync("rtl/arithmetic_engine.sv", join(root, "rtl", "arithmetic_engine.sv"));
    execFileSync("git", ["init", "-q", root]);
    execFileSync("git", ["-C", root, "-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "--allow-empty", "-qm", "test"]);
    const lock = join(home, ".architecture-lab-vivado.lock");
    const runs = join(root, "experiments", "runs");
    const run = (clock = "20", failure = "") => spawnSync("tclsh", [harness, flow, clock], {
      encoding: "utf8", timeout: 15000,
      env: { ...process.env, HOME: home, USERPROFILE: home, ARCHLAB_TEST_FAILURE: failure },
    });
    fn({ run, lock, runs });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

test("mock implementation retains inputs, hashes, stage reports and releases lock", () => fixture(({ run, runs, lock }) => {
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  const dir = join(runs, readdirSync(runs)[0]);
  const read = (name) => readFileSync(join(dir, name), "utf8").trim();
  assert.equal(read("status.txt"), "reports_ready_for_review");
  assert.equal(read("stage.txt"), "complete");
  assert.match(read("clock.xdc"), /-period 20 \[get_ports clk\]/);
  const hash = createHash("sha256").update(readFileSync(join(dir, "arithmetic_engine.sv"))).digest("hex");
  assert.ok(read("manifest.tsv").includes("arithmetic_engine.sv.sha256\t" + hash));
  for (const f of ["synth.dcp", "placed.dcp", "routed.dcp", "timing.rpt", "route-status.rpt", "routed-utilization.rpt", "drc.rpt"]) {
    assert.ok(existsSync(join(dir, f)), f);
  }
  assert.equal(existsSync(lock), false);
}));

test("mock routing and timing failures retain evidence and release lock", () => fixture(({ run, runs, lock }) => {
  for (const failure of ["route", "slack"]) {
    const result = run("20", failure);
    assert.equal(result.status, 1, result.stderr);
    assert.equal(existsSync(lock), false);
  }
  const dirs = readdirSync(runs).map((dir) => join(runs, dir));
  assert.equal(dirs.length, 2);
  for (const dir of dirs) assert.equal(readFileSync(join(dir, "status.txt"), "utf8").trim(), "failed");
  assert.ok(dirs.some((dir) => readFileSync(join(dir, "error.txt"), "utf8").includes("injected route failure")));
  assert.ok(dirs.some((dir) => readFileSync(join(dir, "error.txt"), "utf8").includes("Negative internal setup slack")));
}));

test("invalid clocks and concurrent execution are rejected", () => fixture(({ run, runs, lock }) => {
  assert.equal(run("0").status, 1);
  assert.equal(run("NaN").status, 1);
  assert.equal(run("1001").status, 1);
  writeFileSync(lock, "existing owner");
  assert.equal(run().status, 1);
  assert.equal(readFileSync(lock, "utf8"), "existing owner");
  assert.equal(existsSync(runs), false);
}));
