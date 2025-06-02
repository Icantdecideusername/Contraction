'use strict';

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
  const bufferSize = Math.ceil(totalBits / 8);
  const buffer = new ArrayBuffer(bufferSize); // 🔥 Preallocated buffer

  return { schema, bufferSize, buffer };
}

function generateEncoder(fields) {
  let code = `
    return function encode(obj, buffer) {
      const u8 = new Uint8Array(buffer);
      let val, toWrite;
  `;

  for (const f of fields) {
    const { name, bits, type, precision, chunks } = f;
    const scale = precision || 1;

    code += `
      val = Math.round(obj.${name} * ${scale});
      if ('${type}' === 'int' && val < 0) val += 1 << ${bits};
    `;

    for (const c of chunks) {
      code += `
        toWrite = (val >> ${c.shift}) & ${c.mask};
        u8[${c.bytePos}] = (u8[${c.bytePos}] & ~(${c.mask} << ${c.bitPos})) | (toWrite << ${c.bitPos});
      `;
    }
  }

  code += `
    }
  `;
  return new Function(code)();
}

function generateDecoder(fields) {
  let code = `
    return function decode(buffer) {
      const u8 = new Uint8Array(buffer);
      let val;
      const result = {};
  `;

  for (const f of fields) {
    const { name, bits, type, precision, chunks } = f;
    const scale = precision || 1;

    code += `
      val = 0;
    `;

    for (const c of chunks) {
      code += `
        val |= ((u8[${c.bytePos}] >> ${c.bitPos}) & ${c.mask}) << ${c.shift};
      `;
    }

    code += `
      if ('${type}' === 'int' && (val & (1 << (${bits} - 1))) !== 0) {
        val -= 1 << ${bits};
      }
      result.${name} = val / ${scale};
    `;
  }

  code += `
      return result;
    }
  `;
  return new Function(code)();
}

module.exports = {
  precomputeSchema,
  generateEncoder,
  generateDecoder,
};
