//! Public development fixtures and evaluator. These are not withheld workloads.
use crate::{Node::*, Program, Run};

pub struct Workload {
    pub id: &'static str,
    pub program: Program,
    pub expected_output: u32,
    pub node_count: usize,
    pub critical_path: usize,
}

#[derive(Debug, PartialEq, Eq)]
pub enum EvaluationError {
    InvalidLanes,
    WrongOutput,
    ImpossibleCycles,
}

/// Check the independent result and necessary cycle bounds, not trace correctness.
pub fn evaluate(workload: &Workload, lanes: usize, run: &Run) -> Result<(), EvaluationError> {
    if lanes == 0 {
        return Err(EvaluationError::InvalidLanes);
    }
    if run.output != workload.expected_output {
        return Err(EvaluationError::WrongOutput);
    }
    let lower = workload
        .critical_path
        .max(workload.node_count.div_ceil(lanes));
    if run.cycles < lower || run.cycles > workload.node_count {
        return Err(EvaluationError::ImpossibleCycles);
    }
    Ok(())
}

pub fn development_suite() -> Vec<Workload> {
    vec![
        fixture(
            "mixed",
            vec![
                Literal(2),
                Literal(3),
                Literal(4),
                Literal(5),
                Add(0, 1),
                Mul(2, 3),
                Mul(4, 5),
            ],
            100,
            3,
        ),
        fixture(
            "chain",
            vec![
                Literal(2),
                Literal(3),
                Add(0, 1),
                Literal(4),
                Mul(2, 3),
                Literal(7),
                Add(4, 5),
            ],
            27,
            4,
        ),
        fixture(
            "balanced",
            vec![
                Literal(1),
                Literal(2),
                Literal(3),
                Literal(4),
                Literal(5),
                Literal(6),
                Literal(7),
                Literal(8),
                Add(0, 1),
                Add(2, 3),
                Add(4, 5),
                Add(6, 7),
                Add(8, 9),
                Add(10, 11),
                Add(12, 13),
            ],
            36,
            4,
        ),
        fixture(
            "wraparound",
            vec![
                Literal(u32::MAX),
                Literal(2),
                Add(0, 1),
                Literal(u32::MAX),
                Mul(2, 3),
            ],
            u32::MAX,
            3,
        ),
    ]
}

fn fixture(
    id: &'static str,
    nodes: Vec<crate::Node>,
    expected_output: u32,
    critical_path: usize,
) -> Workload {
    let node_count = nodes.len();
    Workload {
        id,
        program: Program::new(nodes).expect("valid built-in benchmark"),
        expected_output,
        node_count,
        critical_path,
    }
}
