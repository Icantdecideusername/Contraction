const encoder = require('./module.cjs');

const schema = [
  { name: "x", bits: 32, type: "int", precision: 100 },
  { name: "y", bits: 24, type: "int", precision: 100 },
  { name: "z", bits: 32, type: "int", precision: 100 },
  { name: "body_dir", bits: 8, type: "uint" },
  { name: "head_yaw", bits: 6, type: "uint" },
  { name: "head_pitch", bits: 6, type: "uint" },
  { name: "state_flag", bits: 3, type: "uint" },
  { name: "item_holding", bits: 9, type: "uint" },
  { name: "anim_frame", bits: 10, type: "uint" },
  { name: "effects", bits: 12, type: "uint" },
];

const Data = {
  x: -3000000.00,
  y: -694.20,
  z: -12345.99,
  body_dir: 215,
  head_yaw: 30,
  head_pitch: 41,
  state_flag: 7,
  item_holding: 189,
  anim_frame: 489,
  effects: 224,
};

encoder.setup(schema);



// Warmup 10k cycles
for (let i = 0; i < 10_000; i++) {
  encoder.encode(Data, encoder.buffer);
  encoder.decode(encoder.buffer);
}


// Check correctness
console.log("Input data")
console.log(JSON.stringify(Data, null, 2))

console.log("Output data")
console.log(JSON.stringify(encoder.decode(encoder.buffer), null, 2))

// Display buffer size
console.log(`Buffer size: ${encoder.bufferSize} bytes`);

// Benchmark encode
const encodeStart = Date.now();
const encodeIterations = 1_000_000;
for (let i = 0; i < encodeIterations; i++) {
  encoder.encode(Data, encoder.buffer);
}
const encodeEnd = Date.now();
const encodeDurationSec = (encodeEnd - encodeStart) / 1000;
console.log(`Encode ops/sec: ${(encodeIterations / encodeDurationSec).toFixed(2)}`);

// Benchmark decode
const decodeStart = Date.now();
const decodeIterations = 1_000_000;
for (let i = 0; i < decodeIterations; i++) {
  encoder.decode(encoder.buffer);
}
const decodeEnd = Date.now();
const decodeDurationSec = (decodeEnd - decodeStart) / 1000;
console.log(`Decode ops/sec: ${(decodeIterations / decodeDurationSec).toFixed(2)}`);
