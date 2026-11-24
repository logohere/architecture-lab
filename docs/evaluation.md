# Evaluation

Correctness precedes optimization. Freeze semantics, fixtures and evaluator before a search. Verify equivalent results and relevant traces. Test deliberately broken variants, malformed graphs, reset, backpressure and bounded termination where applicable.

Track model cycles, RTL cycles, routed frequency, LUT/FF/BRAM/DSP usage and physical observations separately. Never equate estimated power or simulated cycles with measured silicon performance. Compare identical inputs, precision and target constraints.

Use development workloads for search and independently managed holdouts for finalist evaluation. Report all failed and successful runs, exact commands and artifact hashes. Holdout changes invalidate prior comparisons. Require passing correctness and timing/resource gates before accepting hardware candidates. Physical programming requires operator approval.
