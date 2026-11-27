// Compare sampled interface counters with the fixed serial baseline contract.
export function verifyTiming(output, workloads) {
  const rows = new Map();
  for (const line of output.split(/\r?\n/)) {
    if (!line.startsWith("TIMING,")) continue;
    const fields = line.split(",").slice(1);
    if (fields.length !== 7 || fields.some((field) => !/^\d+$/.test(field))) throw new Error("invalid timing row");
    const [index, mode, accepted, idle, stalled, result, retired] = fields.map(Number);
    const workload = workloads[index];
    const key = index * 2 + mode;
    if (!workload || ![0, 1].includes(mode) || rows.has(key)) throw new Error("unexpected or duplicate timing row");
    const expectedIdle = mode * 2 * (workload.cycles - 1);
    const expectedResult = workload.cycles + expectedIdle;
    if (accepted !== workload.cycles || idle !== expectedIdle || stalled !== 3 ||
        result !== expectedResult || retired !== expectedResult + 4) {
      throw new Error("timing counters differ from serial baseline contract");
    }
    rows.set(key, [workload.id, mode === 0 ? "continuous" : "gapped", workload.cycles, accepted, idle, stalled, result, retired].join(","));
  }
  if (rows.size !== workloads.length * 2) throw new Error("missing timing rows");
  return ["workload,mode,modeled_cycles,accepted_nodes,input_idle_cycles,output_stall_cycles,first_to_result_cycles,first_to_retirement_cycles",
    ...Array.from({ length: rows.size }, (_, i) => rows.get(i))].join("\n") + "\n";
}
