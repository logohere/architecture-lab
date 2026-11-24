# Roadmap

Goal: ship a reproducible local-first hardware architecture exploration tool, starting with a graph accelerator on Cora Z7-07S.

| Gate | Target | Acceptance |
|---|---|---|
| G0 | Day 1 | Runnable arithmetic DAG model, tests, license and contributor guide |
| G1 | Days 2–4 | Fixed reference semantics, benchmark suite, independent negative controls |
| G2 | Days 5–7 | Deterministic search, content-addressed experiment records, cycle and cost accounting |
| G3 | Week 2 | SystemVerilog baseline, reference comparison, routed Vivado reports |
| G4 | Week 3 | Independently validated candidate improvement, physical test with approval |
| G5 | Week 4 | Reproducible public alpha, tutorial, evidence and limitations |

Target windows are planning assumptions, not delivery commitments. If hardware slips, publish a clearly labeled simulator alpha rather than claim FPGA readiness.

Use Rust and SystemVerilog first. Evaluate formal tools and existing compilers with small spikes before adding dependencies. Defer custom ISA, OS, ASIC and full interaction-net runtime until justified.

Run local experiments; no paid cloud by default. Start with a cap of 100 software candidates, 10 RTL candidates and two routed candidates per batch. One Vivado job at a time. Record wall time, resource use, candidate failures and verified improvements. Agents propose structural changes; deterministic search handles parameters.

Distribution: open-source CLI, reproducible benchmark artifacts, short tutorial and real FPGA demo. Validate demand with hardware researchers and small engineering teams. Possible commercial offering: integration, custom optimization and support. No unverified market leadership claims.
