'use strict';

let encode, decode, buffer, bufferSize, u8;

function precomputeSchema(schema) {
  let offset = 0;

  for (const field of schema) {
    field.bitStart = offset;
    offset += field.bits;

    const chunks = [];
    let bitsLeft = field.bits;
    let shift = 0;

    while (bitsLeft > 0) {
      const absBit = field.bitStart + shift;
      const bytePos = Math.floor(absBit / 8);
      const bitPos = absBit % 8;
      const bitsInThisByte = Math.min(8 - bitPos, bitsLeft);
      const mask = (1 << bitsInThisByte) - 1;

      chunks.push({ bytePos, bitPos, bitsInThisByte, mask, shift });

      bitsLeft -= bitsInThisByte;
      shift += bitsInThisByte;
    }

    field.chunks = chunks;
  }

  const totalBits = offset;
  bufferSize = Math.ceil(totalBits / 8);
  buffer = new ArrayBuffer(bufferSize);
  u8 = new Uint8Array(buffer);

  return { schema, bufferSize, buffer };
}

function generateEncoder(fields) {
  let code = 'return function encode(obj) {\n';
  code += '  let val, toWrite;\n';

  for (const f of fields) {
    const { name, bits, type, precision, chunks } = f;
    const scale = precision || 1;

    code += `  val = Math.round(obj.${name} * ${scale});\n`;
    if (type === 'int') {
      code += `  if (val < 0) val += 1 << ${bits};\n`;
    }

    for (const c of chunks) {
      code += `  toWrite = (val >> ${c.shift}) & ${c.mask};\n`;
      code += `  u8[${c.bytePos}] = (u8[${c.bytePos}] & ~(${c.mask} << ${c.bitPos})) | (toWrite << ${c.bitPos});\n`;
    }
  }

  code += '}\n';

  return new Function('u8', code)(u8);
}

function generateDecoder(fields) {
  let code = 'return function decode() {\n';
  code += '  let val;\n';
  code += '  const result = {};\n';

  for (const f of fields) {
    const { name, bits, type, precision, chunks } = f;
    const scale = precision || 1;

    code += '  val = 0;\n';
    for (const c of chunks) {
      code += `  val |= ((u8[${c.bytePos}] >> ${c.bitPos}) & ${c.mask}) << ${c.shift};\n`;
    }

    if (type === 'int') {
      code += `  if ((val & (1 << (${bits} - 1))) !== 0) val -= 1 << ${bits};\n`;
    }
    code += `  result.${name} = val / ${scale};\n`;
  }

  code += '  return result;\n}\n';

  return new Function('u8', code)(u8);
}

function setup(schema) {
  const processed = precomputeSchema(schema);
  encode = generateEncoder(processed.schema);
  decode = generateDecoder(processed.schema);
}

module.exports = {
  setup,
  get encode() { return encode; },
  get decode() { return decode; },
  get buffer() { return buffer; },
  get bufferSize() { return bufferSize; },
};
