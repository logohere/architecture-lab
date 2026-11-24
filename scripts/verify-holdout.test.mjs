import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { validateCorpus } from "./verify-holdout.mjs";

const publicInputs = "mixed|lit:2;lit:3;add:0:1\n";
const encode = (cases) => Buffer.from(JSON.stringify({ schema: "arithmetic-v1", nonce: "a".repeat(32), cases }));
const sample = { id: "private-example", expected: 1, nodes: [["lit", 4294967295], ["lit", 2], ["add", 0, 1]] };

test("independent arithmetic and reproducible corpus digest", () => {
  const bytes = encode([sample]);
  const evidence = validateCorpus(bytes, publicInputs);
  assert.equal(evidence.case_count, 1);
  assert.match(evidence.corpus_sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(validateCorpus(bytes, publicInputs), evidence);
  assert.notEqual(validateCorpus(Buffer.concat([bytes, Buffer.from("\n")]), publicInputs).corpus_sha256, evidence.corpus_sha256);
});

test("rejects wrong output, malformed graph and duplicate cases", () => {
  assert.throws(() => validateCorpus(encode([{ ...sample, expected: 2 }]), publicInputs));
  assert.throws(() => validateCorpus(encode([{ ...sample, nodes: [["lit", 1], ["add", 0, 0]] }]), publicInputs));
  assert.throws(() => validateCorpus(encode([sample, sample]), publicInputs));
  assert.throws(() => validateCorpus(encode([sample, { ...sample, id: "other" }]), publicInputs));
  assert.throws(() => validateCorpus(encode([]), publicInputs));
});

test("rejects public graphs even with commutative operands reordered", () => {
  assert.throws(() => validateCorpus(encode([{ id: "other", expected: 5, nodes: [["lit", 3], ["lit", 2], ["add", 0, 1]] }]), publicInputs), /public workload/);
});

test("actual public suite is exported from the Rust reference and rejected", () => {
  const inputs = execFileSync("cargo", ["run", "--locked", "--quiet", "--", "bench-inputs"], { encoding: "utf8" });
  assert.equal(inputs.trim().split("\n").length, 4);
  const [id, graph] = inputs.trim().split("\n")[0].split("|");
  const nodes = graph.trim().split(";").map((value) => {
    const [op, ...args] = value.split(":");
    return [op, ...args.map(Number)];
  });
  assert.throws(() => validateCorpus(encode([{ id: "renamed-" + id, expected: 100, nodes }]), inputs), /public workload/);
  assert.throws(() => validateCorpus(Buffer.from(JSON.stringify({ schema: "arithmetic-v1", cases: [sample] })), inputs), /invalid corpus schema/);
  assert.equal(validateCorpus(encode([sample]), inputs).case_count, 1);
});
