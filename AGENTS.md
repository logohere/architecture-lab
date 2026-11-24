# Agent instructions

Read README and docs/roadmap.md. Work on feature branches. Keep evaluator and holdouts independent of candidate agents. Use tests before expensive EDA runs; retain source and tool identities, failures and evidence. Do not invent measurements, run unbounded experiments, program hardware, incur paid compute or publish without approval. No unnecessary dependencies or references. Follow CONTRIBUTING.md and preserve upstream license notices.

Use `bunx dotdog@1.0.0 refresh --if-stale` for local graph context and `bunx dotdog@1.0.0 check --json` for graph integrity. Generated graphs are not source or runtime verification. Install optional agent skills with `bunx dotdog@1.0.0 skills install --agent both`.
