use crate::{Buffer, Input, Node, BoxedNodeSend, NodeData, Message, HashMap, 
    // impl_to_boxed_nodedata,
};
use rhai::{Engine, Array, Scope, Dynamic, OptimizationLevel}; //EvalAltResult

pub struct Meta<const N: usize> {
    sr: usize,
    // phase: usize,
    code: &'static str,
    backup: &'static str,
    scope: Scope<'static>,
    engine: Engine,
    input_order: Vec<usize>
}

impl<const N: usize> Meta<N> {

    pub fn new() -> Self {
        let phase: usize = 0;
        let mut scope = Scope::new();
        let output = Vec::<Dynamic>::with_capacity(N);

        scope.push("phase", phase as f32)
        .push("x0", 0.0)
        .push("x1", 0.0)
        .push("x2", 0.0)
        .push("y0", 0.0)
        .push("y1", 0.0)
        .push("y2", 0.0)
        .push("a", 0.0)
        .push("b", 0.0)
        .push("c", 0.0)
        .push("d", 0.0)
        .push("e", 0.0)
        .push("f", 0.0)
        .push("g", 0.0)
        .push("h", 0.0)
        .push("i", 0.0)
        .push("j", 0.0)
        .push("k", 0.0)
        .push("l", 0.0)
        .push("m", 0.0)
        .push("n", 0.0)
        .push("o", 0.0)
        .push("p", 0.0)
        .push("q", 0.0)
        .push("r", 0.0)
        .push("s", 0.0)
        .push("t", 0.0)
        .push("u", 0.0)
        .push("v", 0.0)
        .push("w", 0.0)
        .push("x", 0.0)
        .push("y", 0.0)
        .push("z", 0.0)
        .push("output", output);

        let mut engine = Engine::new();
        engine.set_optimization_level(OptimizationLevel::Full);

        Self {
            sr: 44100,
            engine,
            scope,
            code: "",
            backup: "",
            // phase,
            input_order: Vec::new()
        }
    }

    pub fn sr(self, sr:usize) -> Self {
        Self {sr, ..self}
    }

    pub fn code(self, code: &'static str) -> Self {
        Self {code, ..self}
    }

    pub fn to_boxed_nodedata(mut self, channels: usize) -> NodeData<BoxedNodeSend<N>, N> {
        self.scope.push("sr", self.sr as f32);
        NodeData::multi_chan_node(channels, BoxedNodeSend::<N>::new( self ) )
    }
}

impl<const N:usize> Node<N> for Meta<N> {
    fn process(&mut self, inputs: &mut HashMap<usize, Input<N>>, output: &mut [Buffer<N>]) {
        if inputs.len() > 0 {
            let mut arr = Array::new();
            for i in 0..N {
                arr.push(Dynamic::from_float(inputs[&self.input_order[0]].buffers()[0][i]));
            }
            self.scope.set_or_push("input", arr);
            
        }
        let result = match self.engine.eval_with_scope::<Array>(&mut self.scope, &self.code.replace("`", "")) {
            Ok(v) => {
                if v.len() >= N {
                    let mut ok = true;
                    for i in 0..N {
                        if !v[i].as_float().is_ok() {
                            ok = false;
                        }
                    };
                    if ok {
                        v
                    } else {
                        self.engine.eval_with_scope::<Array>(&mut self.scope, &self.backup.replace("`", "")).unwrap()
                    }
                } else {
                    self.engine.eval_with_scope::<Array>(&mut self.scope, &self.backup.replace("`", "")).unwrap()
                }
            },
            _ => {
                self.engine.eval_with_scope::<Array>(&mut self.scope, &self.backup.replace("`", "")).unwrap()
            }
        };
        for i in 0..N {
            output[0][i] = match result[i].as_float() {
                Ok(v) => v,
                _ => return ()
            };
        }
        // self.phase += N;
    }
    fn send_msg(&mut self, info: Message) {

        match info {
            Message::SetToSymbol(pos, s) => {
                match pos {
                    0 => {self.code = s},
                    _ => {}
                }
            },
            Message::Index(i) => {
                self.input_order.push(i)
            },
            Message::IndexOrder(pos, index) => {
                self.input_order.insert(pos, index)
            },
            _ => {}
        }
    }
}