# Contributing

Architecture Lab welcomes scoped contributions to reproducible hardware architecture research. Read the [README](README.md), [engineering constitution](specs/architecture-lab/constitution.dog) and [implementation plan](specs/architecture-lab/plan.dog) before starting.

## Propose a change

Search existing [issues](https://github.com/logohere/architecture-lab/issues) and pull requests first. File a bug with a reproducible command, actual and expected behavior, and relevant tool versions. For a research proposal, identify the hypothesis, affected specification, acceptance criteria, resource budget and expected evidence.

Use a focused branch from current main. For external contributors, fork the repository first. Avoid unrelated refactoring or speculative dependencies.

## Implement and verify

Change the canonical Dotdog specs when intended behavior changes. Add focused regression or negative-control tests for behavior changes. Keep the evaluator and holdouts independent of candidate optimization.

Install Rustfmt and Clippy if needed with your Rust toolchain manager. Run:

```sh
cargo fmt --check
cargo clippy --locked --all-targets -- -D warnings
cargo test --locked
cargo run --locked -- bench
bunx dotdog@1.0.0 validate
bunx dotdog@1.0.0 check --json
bunx dotdog@1.0.0 scenario-check Benchmark --project architecture-lab --json
bunx dotdog@1.0.0 reference-check --project architecture-lab --json
git diff --check
```

After staging, run `bunx dotdog@1.0.0 check --staged --json`. Node users may use `npx --yes dotdog@1.0.0` instead.

## Submit a pull request

Link the issue, summarize the changes and list exact verification commands, outcomes and remaining limitations. State the public API/CLI compatibility impact and update the Unreleased changelog for user-visible changes. Follow the [version policy](specs/architecture-lab/constitution.dog#version-policy); only an approved release PR changes the release version. Include reproducible evidence for research claims. A draft PR is appropriate for unfinished changes; ready PRs must pass CI. Keep review discussions and implementation decisions in the issue or PR, and keep the specification current.

Main requires pull requests and passing checks. Maintainers review scope, correctness, evidence and licensing before merging. Automated checks do not replace independent review. AI-assisted work follows [AGENTS.md](AGENTS.md) and the same review requirements.

## Research artifacts and licenses

Do not change the evaluator to rescue a candidate. Report negative results as well as successes. Separate simulated, synthesized and physically measured results. Follow the execution budgets and evidence rules in the [constitution](specs/architecture-lab/constitution.dog).

Do not commit generated Dotdog graphs, private inputs, secrets, large binaries or proprietary device data. Add third-party code only when necessary and preserve its license and required notices.

Contributions are licensed under Apache-2.0. Report security vulnerabilities using [SECURITY.md](SECURITY.md).
