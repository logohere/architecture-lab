import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifyTiming } from "./rtl-timing.mjs";

const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== "--timing-csv")) throw new Error("Usage: node scripts/check-rtl.mjs [--timing-csv OUTPUT]");

const run = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8", timeout: 60000, maxBuffer: 1024 * 1024 });
const inputs = run("cargo", ["run", "--locked", "--quiet", "--", "bench-inputs"]).trim().split(/\r?\n/);
const results = run("cargo", ["run", "--locked", "--quiet", "--", "bench"]).trim().split(/\r?\n/);
if (results.shift() !== "workload,lanes,output,modeled_cycles") throw new Error("invalid reference header");
const expected = new Map(results.map((row) => row.split(",")).filter((row) => row[1] === "1").map(([id, , output, cycles]) => [id, [Number(output), Number(cycles)]]));
const vectors = inputs.map((line) => {
  const [id, program] = line.split("|");
  const nodes = program.split(";");
  const result = expected.get(id);
  if (!result || result[1] !== nodes.length || nodes.length > 64) throw new Error("invalid baseline vector");
  return [`${nodes.length} ${result[0].toString(16)}`, ...nodes.map((node) => {
    const [op, a, b] = node.split(":");
    if (op === "lit") return `0 0 0 ${Number(a).toString(16)}`;
    if (op !== "add" && op !== "mul") throw new Error("invalid opcode");
    return `${op === "add" ? 1 : 2} ${a} ${b} 0`;
  })].join("\n");
});
// Directed maximum-size connected graph and independent wrapping multiply.
const maxGraph = ["63 20", "0 0 0 1"];
for (let i = 1; i <= 61; i += 2) maxGraph.push("0 0 0 1", `1 ${i - 1} ${i} 0`);
vectors.push(maxGraph.join("\n"), "3 fffffffe\n0 0 0 ffffffff\n0 0 0 2\n2 0 1 0");
const dir = mkdtempSync(join(tmpdir(), "architecture-lab-rtl-"));
try {
  const input = join(dir, "vectors.txt");
  const executable = join(dir, "arithmetic.vvp");
  writeFileSync(input, `${vectors.length}\n${vectors.join("\n")}\n`);
  run("iverilog", ["-g2012", "-s", "arithmetic_engine_tb", "-o", executable, "rtl/arithmetic_engine.sv", "rtl/tb/arithmetic_engine_tb.sv"]);
  const output = run("vvp", [executable, `+vectors=${input}`]).trim();
  const workloads = [...inputs.map((line) => {
    const id = line.split("|")[0];
    return { id, cycles: expected.get(id)[1] };
  }), { id: "max_graph", cycles: 63 }, { id: "wrap_multiply", cycles: 3 }];
  const csv = verifyTiming(output, workloads);
  // A deliberately broken temporary DUT must trigger the protocol monitor.
  const source = readFileSync("rtl/arithmetic_engine.sv", "utf8");
  const mutant = source.replace("assign in_ready = !rst && !out_valid;", "assign in_ready = !rst;");
  if (mutant === source) throw new Error("protocol negative control no longer applies");
  const mutantPath = join(dir, "mutant.sv");
  const mutantExe = join(dir, "mutant.vvp");
  writeFileSync(mutantPath, mutant);
  run("iverilog", ["-g2012", "-s", "arithmetic_engine_tb", "-o", mutantExe, mutantPath, "rtl/tb/arithmetic_engine_tb.sv"]);
  const bad = spawnSync("vvp", [mutantExe, `+vectors=${input}`], { encoding: "utf8", timeout: 60000 });
  if (bad.status !== 1 || !bad.stdout.includes("protocol: incorrect input readiness after edge"))
    throw new Error("protocol negative control did not trigger expected assertion");
  if (args.length) writeFileSync(args[1], csv, { flag: "wx" });
  console.log(output.split(/\r?\n/).filter((line) => line.startsWith("PASS ")).join("\n"));
  console.log("PASS protocol negative control and " + workloads.length * 2 + " timing comparisons");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
