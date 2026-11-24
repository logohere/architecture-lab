# Architecture Lab

**Reproducible hardware architecture exploration.**

Architecture Lab is a local-first toolkit for developing and evaluating processor architectures.

## Quickstart

Requires Rust 1.97.1 or newer.

```sh
cargo run --locked -- bench
cargo test --locked
```

The benchmark reports four public arithmetic workloads across 1, 2, 4 and 8 execution lanes:

```text
workload,lanes,output,modeled_cycles
mixed,1,100,7
mixed,2,100,4
mixed,4,100,3
mixed,8,100,3
```

These are idealized model cycles, not FPGA measurements.

## Project status

Early research prototype. Arithmetic graph simulation and a public development evaluator work locally; independent holdouts, autonomous search, formal verification and FPGA implementation are planned.

[Specification](specs/architecture-lab/SPEC.dog) · [Roadmap](specs/architecture-lab/plan.dog) · [Engineering rules](specs/architecture-lab/constitution.dog) · [Contributing](CONTRIBUTING.md)

## License

Apache-2.0. See [LICENSE](LICENSE).
