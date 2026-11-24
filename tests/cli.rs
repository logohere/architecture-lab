use std::io::Write;
use std::process::{Command, Output, Stdio};

fn run(lanes: &str, graph: &str) -> Output {
    let mut child = Command::new(env!("CARGO_BIN_EXE_architecture-lab"))
        .args(["run", lanes])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    child
        .stdin
        .take()
        .unwrap()
        .write_all(graph.as_bytes())
        .unwrap();
    child.wait_with_output().unwrap()
}

#[test]
fn executes_arbitrary_graphs() {
    let graph = "lit:2;lit:3;lit:4;lit:5;add:0:1;mul:2:3;mul:4:5\n";
    for (lanes, cycles) in [("1", 7), ("2", 4), ("4", 3), ("8", 3)] {
        let output = run(lanes, graph);
        assert!(output.status.success());
        assert_eq!(
            String::from_utf8_lossy(&output.stdout).replace("\r\n", "\n"),
            format!("output,modeled_cycles\n100,{cycles}\n")
        );
    }
    let output = run("2", "lit:4294967295;lit:2;add:0:1");
    assert!(output.status.success());
    assert_eq!(
        String::from_utf8_lossy(&output.stdout).replace("\r\n", "\n"),
        "output,modeled_cycles\n1,2\n"
    );
}

#[test]
fn rejects_invalid_graphs_and_lanes_without_output() {
    for (lanes, graph) in [
        ("0", "lit:1"),
        ("4096", "lit:1"),
        ("+1", "lit:1"),
        ("2", ""),
        ("2", "lit:4294967296"),
        ("2", "lit:1;add:0:0"),
        ("2", "lit:1;lit:2"),
        ("2", "lit:1;mul:0:4"),
        ("2", "lit:+1"),
        ("2", "lit:1;"),
        ("2", "xor:1:2"),
    ] {
        let output = run(lanes, graph);
        assert!(!output.status.success(), "{lanes}: {graph}");
        assert!(output.stdout.is_empty());
    }
}
