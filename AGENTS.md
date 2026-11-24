# Agent instructions

The authoritative product, data model, rules and plan are in `specs/architecture-lab/*.dog`. README is a public overview, not a separate specification. Update the canonical specs when intent changes. Follow CONTRIBUTING.md.

Use `bunx dotdog@1.0.0 refresh --if-stale --json` before spec/code work and query the smallest relevant context. Inspect source evidence, then run actual tests and `bunx dotdog@1.0.0 check --json` after changes. Generated graphs are not source or runtime verification. Optional agent skills: `bunx dotdog@1.0.0 skills install --agent both`.
