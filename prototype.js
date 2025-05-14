const { performance } = require('perf_hooks');

// ——————————————————————————————————————————————
//                          CONSTANTS
// ——————————————————————————————————————————————

const SHIFT = {
  effects:      0n,
  anim_frame:   12n,
  item_holding: 22n,
  state_flag:   31n,
  head_pitch:   34n,
  head_yaw:     40n,
  body_dir:     46n,
  z:            54n,
  y:            86n,
  x:            110n
};

const MASK = {
  effects:      0xFFFn,
  anim_frame:   0x3FFn,
  item_holding: 0x1FFn,
  state_flag:   0x7n,
  head_pitch:   0x3Fn,
  head_yaw:     0x3Fn,
  body_dir:     0xFFn,
  z:            0xFFFFFFFFn,
  y:            0xFFFFFFn,
  x:            0xFFFFFFFFn
};

const SIGN_CORRECT = {
  x: 1n << 31n,
  y: 1n << 23n,
  z: 1n << 31n
};

// ——————————————————————————————————————————————
//                       ENCODE / DECODE
// ——————————————————————————————————————————————

function encode({ x, y, z, body_dir, head_yaw, head_pitch, state_flag, item_holding, anim_frame, effects }) {
  // Directly scale and mask
  let bx = (BigInt(Math.round(x * 100)) & MASK.x) + (x < 0 ? SIGN_CORRECT.x << 1n : 0n);
  let by = (BigInt(Math.round(y * 100)) & MASK.y) + (y < 0 ? SIGN_CORRECT.y << 1n : 0n);
  let bz = (BigInt(Math.round(z * 100)) & MASK.z) + (z < 0 ? SIGN_CORRECT.z << 1n : 0n);

  let bh = (BigInt(head_yaw + 64) & MASK.head_yaw);
  let bp = (BigInt(head_pitch + 64) & MASK.head_pitch);

  // Use bitwise operations to pack everything into a single BigInt
  return (
    (bx << SHIFT.x) |
    (by << SHIFT.y) |
    (bz << SHIFT.z) |
    (BigInt(body_dir) << SHIFT.body_dir) |
    (bh << SHIFT.head_yaw) |
    (bp << SHIFT.head_pitch) |
    (BigInt(state_flag) << SHIFT.state_flag) |
    (BigInt(item_holding) << SHIFT.item_holding) |
    (BigInt(anim_frame) << SHIFT.anim_frame) |
    (BigInt(effects) << SHIFT.effects)
  );
}

function decode(encoded) {
  // Direct extraction of data using shifts and masks
  let bx = (encoded >> SHIFT.x) & MASK.x;
  let by = (encoded >> SHIFT.y) & MASK.y;
  let bz = (encoded >> SHIFT.z) & MASK.z;

  // Adjust for signs if necessary
  if (bx >= SIGN_CORRECT.x) bx -= SIGN_CORRECT.x << 1n;
  if (by >= SIGN_CORRECT.y) by -= SIGN_CORRECT.y << 1n;
  if (bz >= SIGN_CORRECT.z) bz -= SIGN_CORRECT.z << 1n;

  // Return decoded data
  return {
    X: Number(bx) / 100,
    Y: Number(by) / 100,
    Z: Number(bz) / 100,
    BodyDir: Number((encoded >> SHIFT.body_dir) & MASK.body_dir),
    HeadYaw: Number((encoded >> SHIFT.head_yaw) & MASK.head_yaw) - 64,
    HeadPitch: Number((encoded >> SHIFT.head_pitch) & MASK.head_pitch) - 64,
    StateFlag: Number((encoded >> SHIFT.state_flag) & MASK.state_flag),
    ItemHolding: Number((encoded >> SHIFT.item_holding) & MASK.item_holding),
    AnimFrame: Number((encoded >> SHIFT.anim_frame) & MASK.anim_frame),
    Effects: Number((encoded >> SHIFT.effects) & MASK.effects)
  };
}

// Function to calculate the size of the encoded data in bytes
function bigintToBytes(bigint, byteCount) {
  let hex = bigint.toString(16).padStart(byteCount * 2, '0');
  let bytes = new Uint8Array(byteCount);
  for (let i = 0; i < byteCount; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// ——————————————————————————————————————————————
//                          BENCHMARK
// ——————————————————————————————————————————————

const ITERATIONS = 1_000_000;
const testData = { x: 1234.56, y: 78.9, z: -4567.89,
                   body_dir:128, head_yaw:12, head_pitch:-20,
                   state_flag:3, item_holding:15,
                   anim_frame:512, effects:255 };

let encoded;

// Encode benchmark
let encodeStart = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  encoded = encode(testData);
}
let encodeEnd = performance.now();
let encodeDuration = (encodeEnd - encodeStart) / 1000;
let encodeOpsPerSec = (ITERATIONS / encodeDuration).toFixed(2);

// Decode benchmark
let decodeStart = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  decode(encoded);
}
let decodeEnd = performance.now();
let decodeDuration = (decodeEnd - decodeStart) / 1000;
let decodeOpsPerSec = (ITERATIONS / decodeDuration).toFixed(2);

// Get the correct serialized size in bytes
let bytes = bigintToBytes(encoded, 18);
let encodedSize = bytes.length;

// ——————————————————————————————————————————————
//              OUTPUT RESULTS
// ——————————————————————————————————————————————

console.log(`Encode Speed: ${encodeOpsPerSec} ops/sec`);
console.log(`Decode Speed: ${decodeOpsPerSec} ops/sec`);
console.log(`Encoded Size: ${encodedSize} bytes`);
console.log(`Integer Output: ${encoded}`);
console.log(`Binary Output: ${encoded.toString(2)}`);
