const worker = new Worker('ai-worker.js', { type: 'module' });
worker.postMessage({ type: 'INIT' });

const streamBox = document.getElementById('llm-stream');
const wasiBox = document.getElementById('wasi-console');
const statusTag = document.getElementById('stream-status');
const runBtn = document.getElementById('run-btn');

worker.onmessage = (e) => {
  if (e.data.type === 'READY') {
    statusTag.innerText = 'Engine Ready';
    runBtn.disabled = false;
  } else if (e.data.type === 'WASI_STDOUT') {
    wasiBox.innerText += `
[WASI STDOUT]: ${e.data.text}`;
  } else if (e.data.type === 'COMPLETE') {
    wasiBox.innerText += '

[JIT Engine]: Process exited with code 0.';
    statusTag.innerText = 'Finished';
    runBtn.disabled = false;
  } else if (e.data.type === 'ERROR') {
    wasiBox.innerText += `
[Execution Error]: ${e.data.error}`;
    runBtn.disabled = false;
  }
};

const MOCK_WASM_HEX_CHUNKS = [
  "0061736d01000000",
  "0108026000006004",
  "7f7f7f7f7f021901",
  "04776173695f736e",
  "61737073686f745f70",
  "7265766965773108",
  "66645f7772697465",
  "000103020100070a",
  "01066d656d6f7279",
  "00010a0901070020",
  "0010000b"
];

window.startSimulation = async function() {
  runBtn.disabled = true;
  streamBox.innerText = '';
  wasiBox.innerText = 'Initializing WASI Environment...';
  statusTag.innerText = 'Streaming...';

  let hexAcc = '';
  for (const chunk of MOCK_WASM_HEX_CHUNKS) {
    await new Promise(r => setTimeout(r, 100));
    hexAcc += chunk;
    streamBox.innerText += chunk + ' ';
  }

  const match = hexAcc.match(/.{1,2}/g);
  if (match) {
    const bytes = new Uint8Array(match.map(byte => parseInt(byte, 16)));
    worker.postMessage({ type: 'EXECUTE_WASM', payload: bytes });
  }
};