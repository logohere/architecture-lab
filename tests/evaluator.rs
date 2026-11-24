use architecture_lab::{
    Run,
    benchmarks::{development_suite, evaluate},
};

#[test]
fn fixed_workloads_agree_with_independent_oracles() {
    let suite = development_suite();
    assert_eq!(suite.len(), 4);
    let ids: std::collections::BTreeSet<_> = suite.iter().map(|w| w.id).collect();
    assert_eq!(ids.len(), suite.len());
    for workload in suite {
        assert_eq!(workload.program.reference(), workload.expected_output);
        for lanes in [1, 2, 4, 8] {
            let run = workload.program.simulate(lanes).unwrap();
            assert!(evaluate(&workload, lanes, &run).is_ok());
        }
    }
}

#[test]
fn rejects_wrong_output_and_impossible_cycles() {
    let workload = development_suite().remove(0);
    let correct = workload.program.simulate(2).unwrap();
    for run in [
        Run {
            output: correct.output.wrapping_add(1),
            cycles: correct.cycles,
        },
        Run {
            output: correct.output,
            cycles: 0,
        },
        Run {
            output: correct.output,
            cycles: 2,
        },
        Run {
            output: correct.output,
            cycles: 8,
        },
    ] {
        assert!(evaluate(&workload, 2, &run).is_err());
    }
    assert!(evaluate(&workload, 0, &correct).is_err());
}
