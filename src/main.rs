use architecture_lab::benchmarks::{development_suite, evaluate};
use architecture_lab::{Node, Program};
use std::io::{self, Read};
use std::process::ExitCode;

fn main() -> ExitCode {
    let args: Vec<_> = std::env::args().skip(1).collect();
    match args.as_slice() {
        [command] if command == "bench" => benchmark(),
        [command] if command == "bench-inputs" => benchmark_inputs(),
        [command, lanes] if command == "run" => run_input(lanes),
        [] => {
            println!("Architecture Lab\n\nUsage: architecture-lab <bench|bench-inputs|run LANES>");
            ExitCode::SUCCESS
        }
        _ => {
            eprintln!("Usage: architecture-lab <bench|bench-inputs|run LANES>");
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

fn decimal<T: std::str::FromStr>(s: &str) -> Option<T> {
    if s.is_empty() || !s.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    s.parse().ok()
}

fn parse_input(text: &str) -> Option<Program> {
    let mut nodes = Vec::new();
    for token in text.trim().split(';') {
        if nodes.len() == 4095 {
            return None;
        }
        let parts: Vec<_> = token.split(':').collect();
        let node = match parts.as_slice() {
            ["lit", value] => Node::Literal(decimal(value)?),
            ["add", a, b] => Node::Add(decimal(a)?, decimal(b)?),
            ["mul", a, b] => Node::Mul(decimal(a)?, decimal(b)?),
            _ => return None,
        };
        nodes.push(node);
    }
    Program::new(nodes).ok()
}

fn run_input(lanes: &str) -> ExitCode {
    let Some(lanes) = decimal::<usize>(lanes).filter(|n| (1..=4095).contains(n)) else {
        eprintln!("Invalid lane count");
        return ExitCode::FAILURE;
    };
    let mut text = String::new();
    if io::stdin().take(65_537).read_to_string(&mut text).is_err() || text.len() > 65_536 {
        eprintln!("Invalid input size or encoding");
        return ExitCode::FAILURE;
    }
    let Some(program) = parse_input(&text) else {
        eprintln!("Invalid arithmetic graph");
        return ExitCode::FAILURE;
    };
    let Ok(run) = program.simulate(lanes) else {
        eprintln!("Simulation failed");
        return ExitCode::FAILURE;
    };
    println!("output,modeled_cycles");
    println!("{},{}", run.output, run.cycles);
    ExitCode::SUCCESS
}
