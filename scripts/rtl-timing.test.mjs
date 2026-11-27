import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyTiming } from "./rtl-timing.mjs";

const workloads = [{ id: "example", cycles: 3 }];
const continuous = "TIMING,0,0,3,0,3,3,7";
const gapped = "TIMING,0,1,3,4,3,7,11";
test("valid counters map to named deterministic CSV rows", () => {
  const csv = verifyTiming(gapped + "\n" + continuous, workloads);
  assert.match(csv, /example,continuous,3,3,0,3,3,7\nexample,gapped,3,3,4,3,7,11\n$/);
});
test("rejects missing, duplicate, malformed and incorrect counters", () => {
  for (const output of [continuous, continuous + "\n" + continuous,
    continuous + "\n" + gapped.replace(",4,3,", ",3,3,"),
    continuous + "\n" + gapped.replace(",11", ",10"),
    continuous + "\n" + gapped.replace("TIMING,0,1", "TIMING,1,1"),
    continuous + "\n" + gapped.replace(",11", ",NaN")]) {
    assert.throws(() => verifyTiming(output, workloads));
  }
});
