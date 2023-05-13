cargo build --release --target=wasm32-unknown-unknown
cp -rf ./target/wasm32-unknown-unknown/release/glicol_wasm.wasm ../../js/src
cp -rf ./target/wasm32-unknown-unknown/release/glicol_wasm.wasm ../../js/npm