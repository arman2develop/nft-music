<div align="center">
  <br />
  <p>
    <a href="https://glicol.org"><img src="./logo.png" width="200" /></a>
  </p>
</div>

GLICOL (an acronym for "graph-oriented live coding language") is a computer music language written in Rust. This repository contains the source code of Glicol. The Rust code of Glicol can be used as a standalone Rust audio library and the JavaScript code can be embedded in any website using the CDN link.

## Where to start?

Glicol has launched its official website at: 

https://glicol.org

Still, the old web app will remain as the playground:

https://glicol.web.app

*On both website, opening the browser console is important. Help files and some essential commands are exported there.*

## Repo structure

The structure shows that Glicol can be used independently as a JavaScript library in the browser, or used as an audio library for other Rust projects:

```
js/
├─ src/
│  ├─ glicol_wasm.wasm
│  ├─ glicol-docs.json
│  ├─ glicol-engine.js
│  ├─ glicol.js
├─ index.html
rs/
├─ ext/
├─ macro/
├─ main/
├─ parser/
├─ synth/
├─ wasm/
```

### Rust

The `rs` folder contains the Rust code for Glicol.

The `rs/main` is the main entrance of crate `glicol`.

The `rs/parser` is the `glicol_parser` crate, which provides the parsing tool for Glicol syntax.

The `rs/synth` is the `glicol_synth` crate, which contains the DSP code for Glicol and can be used as an independent audio lib.

The `rs/macro` provides Rust macros for developing Glicol extensions.

The `rs/ext` is the Glicol extensions, which replies on `glicol_synth`, `glicol_parser` and `glicol_macro`. The idea is to use the essential nodes in `glicol_synth` to form some more complicated nodes, e.g. reverb nodes. Developers can use the `glicol_macro` to write new node in Glicol syntax within Rust.

The `rs/wasm` is basically the glue code for compiling the `glicol` crate into a WebAssembly file.

See the [README.md](./rs/README.md) file in the `rs` folder for details.

### JavaScript

The `js` folder contains the Glicol distribution for the web platform.

The usage is very easy. Just include this into your `index.html`:

```
<script src="https://cdn.jsdelivr.net/gh/chaosprint/glicol@latest/js/src/glicol.js"></script>
```

See the `README.md` in `js` folder for details.

## Contribution

Suggestions, bug reporting, or PR are warmly welcomed.

## Acknowledgement

This work was partially supported by the Research Council of Norway through its Centres of Excellence scheme, project number 262762 and by NordForsk's Nordic University Hub Nordic Sound and Music Computing Network NordicSMC, project number 86892.

## License

The MIT License (MIT)

Copyright (c) 2020 - present Qichao Lan (chaosprint)
