# Architecture

```text
Workloads + fixed evaluator
  -> reference semantics
  -> modeled candidate search
  -> independent RTL checks
  -> synthesis and routing
  -> approved hardware test
  -> reproducible evidence
```

Current model: a topologically ordered arithmetic DAG with one consumer per non-root node, 32-bit wrapping addition and multiplication, and a deterministic ready-node scheduler. Every node takes one modeled cycle; memory and interconnect costs are not modeled. This is an initial restricted substrate, not a general interaction-net implementation.

Planned: independent evaluator, candidate configuration, experiment ledger, RTL, and board adapter. Store versioned inputs, source/tool hashes, seeds, elapsed time and failure reports. Cache only identical behavior-affecting inputs. Isolate agent proposals from the evaluator and withheld workloads.

Target: Digilent Cora Z7-07S; board configuration and Vivado integration remain pending. No dependency on another personal repository or hosted service.
