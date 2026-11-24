use architecture_lab::{Error, Node::*, Program, Run};

fn graph() -> Program {
    Program::new(vec![
        Literal(2),
        Literal(3),
        Literal(4),
        Literal(5),
        Add(0, 1),
        Mul(2, 3),
        Mul(4, 5),
    ])
    .unwrap()
}

#[test]
fn reference_and_schedule_agree() {
    let p = graph();
    assert_eq!(p.reference(), 100);
    assert_eq!(
        p.simulate(1),
        Ok(Run {
            output: 100,
            cycles: 7
        })
    );
    assert_eq!(
        p.simulate(2),
        Ok(Run {
            output: 100,
            cycles: 4
        })
    );
    assert_eq!(
        p.simulate(4),
        Ok(Run {
            output: 100,
            cycles: 3
        })
    );
}

#[test]
fn invalid_inputs_are_rejected() {
    assert!(matches!(Program::new(vec![]), Err(Error::InvalidGraph)));
    assert!(matches!(
        Program::new(vec![Literal(1), Add(0, 0)]),
        Err(Error::InvalidGraph)
    ));
    assert!(matches!(
        Program::new(vec![Add(0, 1), Literal(2)]),
        Err(Error::InvalidGraph)
    ));
    assert!(matches!(
        Program::new(vec![Literal(1), Literal(2)]),
        Err(Error::InvalidGraph)
    ));
    assert_eq!(graph().simulate(0), Err(Error::InvalidLanes));
}

#[test]
fn arithmetic_wraps_consistently() {
    let p = Program::new(vec![Literal(u32::MAX), Literal(2), Add(0, 1)]).unwrap();
    assert_eq!(p.reference(), 1);
    assert_eq!(p.simulate(2).unwrap().output, 1);
}
