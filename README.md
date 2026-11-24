# Architecture Lab

**Reproducible hardware architecture exploration.**

Architecture Lab is a local-first toolkit for developing and evaluating processor architectures. Start with a deterministic reference model, explore candidates, and promote independently verified designs to FPGA hardware.

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

Early research prototype. The arithmetic DAG model and scheduler run locally. Automated search, full graph reduction, formal verification and Cora Z7-07S RTL are planned, not implemented.

[Architecture](docs/architecture.md) · [Roadmap](docs/roadmap.md) · [Evaluation](docs/evaluation.md) · [Contributing](CONTRIBUTING.md)

## License

Apache-2.0. See [LICENSE](LICENSE).
