const { precomputeSchema, generateEncoder, generateDecoder } = require('./test');

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

const { schema: precomputed, bufferSize } = precomputeSchema(schema);
const encode = generateEncoder(precomputed);
const decode = generateDecoder(precomputed);
const buffer = new ArrayBuffer(bufferSize);

// Encode once
encode(Data, buffer);
const result = decode(buffer);

// Output nicely
console.log("Data in")
console.log(JSON.stringify(Data, null, 2))

console.log("Decoded")
console.log(JSON.stringify(result, null, 2));
console.log(`\nBuffer size: ${bufferSize} bytes`);

// Warm up
let warmup = 10_000
for (let i = 0; i < warmup; i++) {
  encode(Data, buffer);
}
for (let i = 0; i < warmup; i++) {
  decode(buffer);
}

// Benchmark
const iterations = 1_000_000;

// Encode benchmark
let t0 = process.hrtime.bigint();
for (let i = 0; i < iterations; i++) {
  encode(Data, buffer);
}
let t1 = process.hrtime.bigint();
let encodeOps = Math.floor((iterations * 1e9) / Number(t1 - t0));

// Decode benchmark
t0 = process.hrtime.bigint();
for (let i = 0; i < iterations; i++) {
  decode(buffer);
}
t1 = process.hrtime.bigint();
let decodeOps = Math.floor((iterations * 1e9) / Number(t1 - t0));

console.log(`Encode ops/sec: ${encodeOps.toLocaleString()}`);
console.log(`Decode ops/sec: ${decodeOps.toLocaleString()}`);
