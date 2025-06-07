'use strict';

const { setup } = require('./general.cjs');

const schema = [
  { name: "x", type: "varint", precision: 100 },
  { name: "y", type: "varint", precision: 100 },
  { name: "z", type: "varint", precision: 100 },
  { name: "body_dir", bits: 8, type: "uint", precision: 1 },
  { name: "head_yaw", bits: 6, type: "uint", precision: 1 },
  { name: "head_pitch", bits: 6, type: "uint", precision: 1 },
  { name: "state_flag", bits: 3, type: "uint", precision: 1 },
  { name: "item_holding", bits: 9, type: "uint", precision: 1 },
  { name: "anim_frame", bits: 10, type: "uint", precision: 1 },
  { name: "effects", bits: 12, type: "uint", precision: 1 },
];

const testObj = {
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

const codec = setup(schema);

// Get buffer length
const len = codec.encode(testObj);
const decoded = codec.decode(len);

function benchmark(iterations = 1_000_000) {
  // Warmup
  for (let i = 0; i < 10_000; i++) {
    const l = codec.encode(testObj);
    codec.decode(l);
  }

  // Encoding benchmark
  const startEncode = process.hrtime.bigint();
  let length;
  for (let i = 0; i < iterations; i++) {
    length = codec.encode(testObj);
  }
  const endEncode = process.hrtime.bigint();
  const encodeTimeNs = Number(endEncode - startEncode);
  const encodeOps = (iterations * 1e9) / encodeTimeNs;

  // Decoding benchmark
  const startDecode = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    codec.decode(length);
  }
  const endDecode = process.hrtime.bigint();
  const decodeTimeNs = Number(endDecode - startDecode);
  const decodeOps = (iterations * 1e9) / decodeTimeNs;

  console.log('--- Benchmark Results ---');
  console.log(`Iterations: ${iterations.toLocaleString()}`);
  console.log(`Encode ops/sec: ${encodeOps.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
  console.log(`Decode ops/sec: ${decodeOps.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
  console.log(`Encoded buffer size: ${length} bytes`);
  console.log(`Decoded matches original: ${JSON.stringify(testObj) === JSON.stringify(codec.decode(length))}`);
}

benchmark();
