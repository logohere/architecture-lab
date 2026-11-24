use architecture_lab::Node;
use architecture_lab::benchmarks::{development_suite, evaluate};
use std::process::ExitCode;

fn main() -> ExitCode {
    let args: Vec<_> = std::env::args().skip(1).collect();
    match args.as_slice() {
        [command] if command == "bench" => benchmark(),
        [command] if command == "bench-inputs" => benchmark_inputs(),
        [] => {
            println!("Architecture Lab\n\nUsage: architecture-lab <bench|bench-inputs>");
            ExitCode::SUCCESS
        }
        _ => {
            eprintln!("Usage: architecture-lab <bench|bench-inputs>");
            ExitCode::FAILURE
        }
    }
}

fn benchmark() -> ExitCode {
    println!("workload,lanes,output,modeled_cycles");
    for workload in development_suite() {
        if workload.program.reference() != workload.expected_output {
            eprintln!("Reference mismatch: {}", workload.id);
            return ExitCode::FAILURE;
        }
        for lanes in [1, 2, 4, 8] {
            let Ok(run) = workload.program.simulate(lanes) else {
                eprintln!("Simulation failed: {} ({lanes} lanes)", workload.id);
                return ExitCode::FAILURE;
            };
            if let Err(error) = evaluate(&workload, lanes, &run) {
                eprintln!(
                    "Evaluation failed: {} ({lanes} lanes): {error:?}",
                    workload.id
                );
                return ExitCode::FAILURE;
            }
            println!("{},{lanes},{},{}", workload.id, run.output, run.cycles);
        }
    }
    ExitCode::SUCCESS
}

fn benchmark_inputs() -> ExitCode {
    for workload in development_suite() {
        let nodes: Vec<_> = workload
            .program
            .nodes()
            .iter()
            .map(|node| match node {
                Node::Literal(v) => format!("lit:{v}"),
                Node::Add(a, b) => format!("add:{a}:{b}"),
                Node::Mul(a, b) => format!("mul:{a}:{b}"),
            })
            .collect();
        println!("{}|{}", workload.id, nodes.join(";"));
    }
    ExitCode::SUCCESS
}
