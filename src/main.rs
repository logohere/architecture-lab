use architecture_lab::{Node::*, Program};
use std::process::ExitCode;

fn main() -> ExitCode {
    let args: Vec<_> = std::env::args().skip(1).collect();
    match args.as_slice() {
        [command] if command == "bench" => {
            let program = Program::new(vec![
                Literal(2),
                Literal(3),
                Literal(4),
                Literal(5),
                Add(0, 1),
                Mul(2, 3),
                Mul(4, 5),
            ])
            .expect("valid built-in fixture");
            println!("lanes,output,modeled_cycles");
            for lanes in [1, 2, 4] {
                let run = program.simulate(lanes).expect("valid lane count");
                if run.output != program.reference() {
                    eprintln!("reference mismatch");
                    return ExitCode::FAILURE;
                }
                println!("{lanes},{},{}", run.output, run.cycles);
            }
            ExitCode::SUCCESS
        }
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
