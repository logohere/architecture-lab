import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { closeSync, fstatSync, openSync, readSync, readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_BYTES = 1024 * 1024;
const U32 = 0xffffffff;
const digest = (data) => createHash("sha256").update(data).digest("hex");
const integer = (value, max) => Number.isSafeInteger(value) && value >= 0 && value <= max;

function inspectGraph(nodes) {
  if (!Array.isArray(nodes) || nodes.length === 0 || nodes.length > 4095) {
    throw new Error("invalid graph size");
  }
  const used = new Set();
  const values = [];
  const fingerprints = [];
  for (const [i, node] of nodes.entries()) {
    if (!Array.isArray(node)) throw new Error("invalid node");
    const [op, a, b] = node;
    if (op === "lit" && node.length === 2 && integer(a, U32)) {
      values.push(BigInt(a));
      fingerprints.push(digest(`lit:${a}`));
    } else if ((op === "add" || op === "mul") && node.length === 3) {
      for (const input of [a, b]) {
        if (!integer(input, i - 1) || used.has(input)) throw new Error("invalid graph edge");
        used.add(input);
      }
      const value = op === "add" ? values[a] + values[b] : values[a] * values[b];
      values.push(BigInt.asUintN(32, value));
      fingerprints.push(digest(`${op}:${[fingerprints[a], fingerprints[b]].sort().join(":")}`));
    } else {
      throw new Error("invalid node");
    }
  }
  if (used.size !== nodes.length - 1) throw new Error("disconnected graph");
  return { output: Number(values.at(-1)), fingerprint: fingerprints.at(-1) };
}

function parsePublicInputs(text) {
  const ids = new Set();
  const graphs = new Set();
  for (const line of text.trim().split("\n")) {
    const [id, input, ...extra] = line.trim().split("|");
    if (!id || !input || extra.length || ids.has(id)) throw new Error("invalid public suite");
    ids.add(id);
    const nodes = input.split(";").map((node) => {
      const [op, ...args] = node.split(":");
      if (args.some((arg) => !/^\d+$/.test(arg))) throw new Error("invalid public node");
      return [op, ...args.map(Number)];
    });
    graphs.add(inspectGraph(nodes).fingerprint);
  }
  return { ids, graphs };
}

export function validateCorpus(bytes, publicInputs) {
  if (bytes.length === 0 || bytes.length > MAX_BYTES) throw new Error("invalid corpus size");
  const corpus = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  if (corpus?.schema !== "arithmetic-v1" || typeof corpus.nonce !== "string" ||
      !/^[a-f0-9]{32}$/.test(corpus.nonce) || !Array.isArray(corpus.cases) ||
      corpus.cases.length === 0 || corpus.cases.length > 256) throw new Error("invalid corpus schema");
  const { ids: publicIds, graphs: publicGraphs } = parsePublicInputs(publicInputs);
  const ids = new Set();
  const graphs = new Set();
  for (const entry of corpus.cases) {
    if (!entry || typeof entry.id !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(entry.id) ||
        !integer(entry.expected, U32) || ids.has(entry.id)) throw new Error("invalid or duplicate case");
    const { output, fingerprint } = inspectGraph(entry.nodes);
    if (output !== entry.expected) throw new Error("reference output mismatch");
    if (publicIds.has(entry.id) || publicGraphs.has(fingerprint)) throw new Error("public workload reused");
    if (graphs.has(fingerprint)) throw new Error("duplicate workload");
    ids.add(entry.id);
    graphs.add(fingerprint);
  }
  return {
    schema: "arithmetic-v1",
    case_count: corpus.cases.length,
    corpus_sha256: digest(bytes),
    public_suite_sha256: digest(publicInputs.replaceAll("\r\n", "\n")),
    evaluator_sha256: digest(readFileSync(fileURLToPath(import.meta.url), "utf8").replaceAll("\r\n", "\n")),
  };
}

function expectedCycles(nodes, lanes) {
  const parent = new Array(nodes.length).fill(-1);
  const remaining = new Array(nodes.length).fill(0);
  let ready = [];
  for (const [i, [op, a, b]] of nodes.entries()) {
    if (op === "lit") ready.push(i);
    else {
      remaining[i] = 2;
      parent[a] = parent[b] = i;
    }
  }
  let cycles = 0;
  let completed = 0;
  while (ready.length) {
    ready.sort((a, b) => a - b);
    const batch = ready.splice(0, lanes);
    for (const i of batch) {
      const next = parent[i];
      if (next >= 0 && --remaining[next] === 0) ready.push(next);
    }
    completed += batch.length;
    cycles++;
  }
  if (completed !== nodes.length) throw new Error("incomplete baseline schedule");
  return cycles;
}

export function verifyBaseline(bytes, publicInputs, execute) {
  const seal = validateCorpus(bytes, publicInputs);
  const { cases } = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  const totals = [];
  for (const lanes of [1, 2, 4, 8]) {
    let modeled_cycles = 0;
    for (const entry of cases) {
      const input = entry.nodes.map((node) => node.join(":")).join(";");
      const cycles = expectedCycles(entry.nodes, lanes);
      const actual = execute(input, lanes).replaceAll("\r\n", "\n");
      if (actual !== `output,modeled_cycles\n${entry.expected},${cycles}\n`) {
        throw new Error("baseline result mismatch");
      }
      modeled_cycles += cycles;
    }
    totals.push({ lanes, modeled_cycles });
  }
  return { ...seal, baseline: totals, evaluated_runs: cases.length * 4 };
}

function readBounded(path) {
  const fd = openSync(path, "r");
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size > MAX_BYTES) throw new Error("invalid corpus file");
    const buffer = Buffer.alloc(MAX_BYTES + 1);
    let count = 0;
    while (count < buffer.length) {
      const read = readSync(fd, buffer, count, buffer.length - count, null);
      if (!read) break;
      count += read;
    }
    return buffer.subarray(0, count);
  } finally {
    closeSync(fd);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const baseline = process.argv[3] === "--baseline";
    if (process.argv.length !== (baseline ? 4 : 3)) throw new Error("invalid arguments");
    const root = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
    const path = realpathSync(process.argv[2]);
    const rel = relative(root, path);
    if (!isAbsolute(rel) && rel !== ".." && !rel.startsWith("../") && !rel.startsWith("..\\")) {
      throw new Error("corpus must remain outside the repository");
    }
    const bytes = readBounded(path);
    const options = { cwd: root, encoding: "utf8", timeout: 60000, maxBuffer: MAX_BYTES };
    if (baseline) {
      const messages = execFileSync("cargo", ["build", "--locked", "--bin", "architecture-lab", "--message-format=json"], options);
      const artifacts = messages.trim().split("\n").map(JSON.parse).filter((m) =>
        m.reason === "compiler-artifact" && m.target.name === "architecture-lab" && m.executable);
      if (artifacts.length !== 1) throw new Error("missing baseline executable");
      const executable = artifacts[0].executable;
      const executable_sha256 = digest(readFileSync(executable));
      const publicInputs = execFileSync(executable, ["bench-inputs"], options);
      const evidence = verifyBaseline(bytes, publicInputs, (input, lanes) =>
        execFileSync(executable, ["run", String(lanes)], { ...options, input }));
      console.log(JSON.stringify({ ...evidence, executable_sha256 }, null, 2));
    } else {
      const publicInputs = execFileSync("cargo", ["run", "--locked", "--quiet", "--", "bench-inputs"], options);
      console.log(JSON.stringify(validateCorpus(bytes, publicInputs), null, 2));
    }
  } catch {
    console.error("Corpus validation failed; inspect the reviewer-side input locally.");
    process.exitCode = 1;
  }
}
