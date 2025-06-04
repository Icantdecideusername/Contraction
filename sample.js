const encoder = require('./module.cjs');

const schema = [
  { name: "testvalue1", bits: 32, type: "int", precision: 10000 },
  { name: "testvalue2", bits: 24, type: "uint" },
];

const testData = {
  testvalue1: 160.2216,
  testvalue2: 10,
};

encoder.setup(schema);

encoder.encode(testData, encoder.buffer);

const decoded = encoder.decode(encoder.buffer);

console.log('Original:', testData);
console.log('Decoded:', decoded);
console.log(`Buffer size: ${encoder.bufferSize} bytes`);
