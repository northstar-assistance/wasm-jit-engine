import init, { FastWasmDecoder } from './pkg/wasm_jit_engine.js';

let decoder = null;

self.onmessage = async (event) => {
  const { type, payload } = event.data;

  if (type === 'INIT') {
    await init();
    decoder = new FastWasmDecoder();
    self.postMessage({ type: 'READY' });
  }

  if (type === 'EXECUTE_WASM') {
    try {
      let outputBuffer = "";

      const importObject = {
        wasi_snapshot_preview1: {
          fd_write: (fd, iovs, iovs_len, nwritten) => {
            const memory = new Uint8Array(wasmInstance.exports.memory.buffer);
            const view = new DataView(wasmInstance.exports.memory.buffer);
            let written = 0;

            for (let i = 0; i < iovs_len; i++) {
              const ptr = iovs + (i * 8);
              const buf = view.getUint32(ptr, true);
              const bufLen = view.getUint32(ptr + 4, true);

              const bytes = memory.slice(buf, buf + bufLen);
              outputBuffer += new TextDecoder().decode(bytes);
              written += bufLen;
            }

            view.setUint32(nwritten, written, true);
            self.postMessage({ type: 'WASI_STDOUT', text: outputBuffer });
            return 0;
          }
        }
      };

      const compiledModule = await WebAssembly.compile(payload);
      const wasmInstance = await WebAssembly.instantiate(compiledModule, importObject);

      if (wasmInstance.exports._start) {
        wasmInstance.exports._start();
      }
      self.postMessage({ type: 'COMPLETE' });
    } catch (err) {
      self.postMessage({ type: 'ERROR', error: err.message });
    }
  }
};