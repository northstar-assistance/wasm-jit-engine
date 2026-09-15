# wasm-jit-engine

A WebAssembly JIT compilation engine with WASI host bindings and streaming hex decoder. This project demonstrates runtime WebAssembly compilation, dynamic assembly generation, and WASI system call handling in a browser environment.

## Features

- 🔧 **JIT Compilation**: Compile WebAssembly operations to native x86-64 machine code at runtime using `dynasm`
- 📦 **WASI Integration**: Full WASI host binding support for `fd_write` system calls
- 🌊 **Streaming Decoder**: Incremental hex-to-binary conversion for streaming WebAssembly bytecode
- 🧵 **Web Workers**: Offload compilation to a dedicated worker thread
- 🎮 **Interactive Dashboard**: Real-time visualization of bytecode stream and WASI console output

## Architecture

### Components

1. **Rust Backend (`src/lib.rs`)**
   - `JitCompiler`: Translates WASM opcodes to x86-64 assembly
   - `ControlFrame`: Manages control flow structures (blocks, loops, branches)
   - `FastWasmDecoder`: Streaming hex decoder for binary WASM modules
   - `host_fd_write`: WASI host function for stdout/stderr output

2. **Web Frontend**
   - `index.html`: Dashboard UI with GitHub Dark theme
   - `main.js`: Main thread coordinator and UI event handler
   - `ai-worker.js`: Web Worker for WASM instantiation and execution

## Building

### Prerequisites

- [Rust 1.56+](https://rustup.rs/)
- [wasm-pack](https://rustwasm.org/wasm-pack/installer/)
- Node.js 14+ (for `wasm-pack`)

### Build Steps

```bash
# Install dependencies
npm install

# Build the WASM module
npm run build

# Start a local server
npm run dev
# or
npm run serve
```

The WASM module will be compiled to `pkg/` directory with JavaScript bindings.

## Usage

1. Open `index.html` in a modern browser (Chrome, Firefox, Safari, Edge)
2. Click **"Run Pipeline"** to:
   - Stream mock WASM bytecode chunks in real-time
   - Compile the hex data to binary
   - Execute the WASM module in a Web Worker
   - Display output in the WASI console

## Project Structure

```
wasm-jit-engine/
├── src/
│   └── lib.rs              # Core Rust JIT compiler & WASI bindings
├── .github/
│   └── workflows/
│       └── test.yml        # CI/CD pipeline
├── Cargo.toml              # Rust dependencies
├── build.rs                # Build script for dynasm
├── package.json            # npm dependencies
├── wasm-pack.toml          # WASM build optimization
├── .gitignore              # Git ignore rules
├── index.html              # Web dashboard UI
├── main.js                 # Main thread coordinator
├── ai-worker.js            # Web Worker for WASM execution
└── README.md               # This file
```

## Implementation Details

### JIT Translation Pipeline

```
WasmOp enum → dynasm! macro → Assembler buffer → ExecutableBuffer → Native code
```

Supported operations:
- `I32Const`: Move 32-bit constant to register
- `I32Add`: Addition of two integers
- `I32Eqz`: Test if value is zero
- `Block/Loop/If`: Control flow structures
- `BrIf`: Conditional branch
- `CallWasiFdWrite`: WASI system call
- `Return`: Function return

### Register Allocation

Simple stack-based register allocation using `rax` and `rcx` for operand storage:
- First operand → `rax`
- Second operand → `rcx`
- Results stay in `rax`

## Known Limitations

- ⚠️ **If-block implementation incomplete** (see `todo!` at line 146 in `src/lib.rs`)
- ⚠️ Only x86-64 architecture supported
- ⚠️ Limited WASI syscall coverage (only `fd_write` implemented)
- ⚠️ Simplified register allocator (no spill handling)
- ⚠️ Mock WASM bytecode chunks in frontend (not real LLM integration)

## Testing

Run the test suite:

```bash
cargo test --lib
```

The GitHub Actions workflow (`.github/workflows/test.yml`) automatically runs tests and builds the WASM module on every push.

## Future Improvements

- [ ] Implement If-block conditional logic
- [ ] Add more WASI syscalls (file operations, memory functions)
- [ ] Advanced register allocation with spilling
- [ ] Support for i64, f32, f64 operations
- [ ] Real LLM bytecode streaming
- [ ] WASM validation and verification

## Development

### Debugging

To enable debug output, modify `ai-worker.js` to log intermediate states:

```javascript
console.log('WASI output:', outputBuffer);
console.log('Wasm exports:', wasmInstance.exports);
```

## License

MIT

## References

- [dynasm-rs Documentation](https://github.com/CensoredUsername/dynasm-rs)
- [wasm-bindgen Guide](https://rustwasm.org/docs/wasm-bindgen/)
- [WASI Specification](https://github.com/WebAssembly/WASI)
- [WebAssembly Spec](https://webassembly.org/specs/)
