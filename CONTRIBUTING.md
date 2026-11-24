# Contributing

Use a feature branch and pull request. Keep changes scoped and include tests and reproducible evidence.

```sh
cargo fmt --check
cargo clippy --locked --all-targets -- -D warnings
cargo test --locked
cargo run --locked -- bench
```

Do not change the evaluator to rescue a candidate. Disclose model assumptions, negative results and measurement limitations. Add third-party code only when necessary; record its exact revision, license and required notices. Contributions are licensed under Apache-2.0.
