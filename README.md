# Architecture Lab

**Reproducible hardware architecture exploration.**

Architecture Lab is a local-first toolkit for developing and evaluating processor architectures.

## Quickstart

Requires Rust 1.97.1 or newer.

```sh
cargo run --locked -- bench
cargo test --locked
```

Example output:

```text
lanes,output,modeled_cycles
1,100,7
2,100,4
4,100,3
```

These are idealized model cycles, not FPGA measurements.

## Project status

Early research prototype. Arithmetic graph simulation works locally; autonomous search, formal verification and FPGA implementation are planned.

[Specification](specs/architecture-lab/SPEC.dog) · [Roadmap](specs/architecture-lab/plan.dog) · [Engineering rules](specs/architecture-lab/constitution.dog) · [Contributing](CONTRIBUTING.md)

## License

Apache-2.0. See [LICENSE](LICENSE).
