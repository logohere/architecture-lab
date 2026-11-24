//! Single-owner arithmetic DAG and idealized unit-latency scheduler.

pub mod benchmarks;
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Node {
    Literal(u32),
    Add(usize, usize),
    Mul(usize, usize),
}

#[derive(Debug, PartialEq, Eq)]
pub enum Error {
    InvalidGraph,
    InvalidLanes,
}

pub struct Program {
    nodes: Vec<Node>,
}

#[derive(Debug, PartialEq, Eq)]
pub struct Run {
    pub output: u32,
    pub cycles: usize,
}

impl Program {
    pub fn new(nodes: Vec<Node>) -> Result<Self, Error> {
        if nodes.is_empty() {
            return Err(Error::InvalidGraph);
        }
        let mut used = vec![false; nodes.len()];
        for (i, node) in nodes.iter().enumerate() {
            if let Node::Add(a, b) | Node::Mul(a, b) = *node {
                for input in [a, b] {
                    if input >= i || used[input] {
                        return Err(Error::InvalidGraph);
                    }
                    used[input] = true;
                }
            }
        }
        if used[..nodes.len() - 1].contains(&false) {
            return Err(Error::InvalidGraph);
        }
        Ok(Self { nodes })
    }

    pub fn reference(&self) -> u32 {
        let mut values: Vec<u32> = Vec::with_capacity(self.nodes.len());
        for node in &self.nodes {
            values.push(match *node {
                Node::Literal(v) => v,
                Node::Add(a, b) => values[a].wrapping_add(values[b]),
                Node::Mul(a, b) => values[a].wrapping_mul(values[b]),
            });
        }
        values[values.len() - 1]
    }

    pub fn simulate(&self, lanes: usize) -> Result<Run, Error> {
        if lanes == 0 {
            return Err(Error::InvalidLanes);
        }
        let n = self.nodes.len();
        let mut values = vec![None::<u32>; n];
        let mut cycles = 0;
        while values[n - 1].is_none() {
            let mut batch = Vec::new();
            for (i, node) in self.nodes.iter().enumerate() {
                if values[i].is_some() {
                    continue;
                }
                let value = match *node {
                    Node::Literal(v) => Some(v),
                    Node::Add(a, b) => values[a].zip(values[b]).map(|(x, y)| x.wrapping_add(y)),
                    Node::Mul(a, b) => values[a].zip(values[b]).map(|(x, y)| x.wrapping_mul(y)),
                };
                if let Some(v) = value {
                    batch.push((i, v));
                    if batch.len() == lanes {
                        break;
                    }
                }
            }
            if batch.is_empty() {
                return Err(Error::InvalidGraph);
            }
            for (i, v) in batch {
                values[i] = Some(v);
            }
            cycles += 1;
        }
        Ok(Run {
            output: values[n - 1].ok_or(Error::InvalidGraph)?,
            cycles,
        })
    }
}
