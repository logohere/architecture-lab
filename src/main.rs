use architecture_lab::benchmarks::{development_suite, evaluate};
use std::process::ExitCode;

fn main() -> ExitCode {
    let args: Vec<_> = std::env::args().skip(1).collect();
    match args.as_slice() {
        [command] if command == "bench" => benchmark(),
        [] => {
            println!("Architecture Lab\n\nUsage: architecture-lab bench");
            ExitCode::SUCCESS
        }
        _ => {
            eprintln!("Usage: architecture-lab bench");
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
