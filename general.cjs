'use strict';

function setup(schema) {
  const buf = new Uint8Array(128);
  const outObj = {};

  let encodeSrc = `
    let offset = 0;
    let temp, scaledVal;
  `;

  for (const f of schema) {
    if (f.type === 'varint') {
      encodeSrc += `
    {
      temp = Math.round(obj["${f.name}"] * ${f.precision || 1}) | 0;
      temp = (temp << 1) ^ (temp >> 31);
      while (temp > 0x7F) {
        buf[offset++] = (temp & 0x7F) | 0x80;
        temp >>>= 7;
      }
      buf[offset++] = temp;
    }
      `;
    } else if (f.type === 'int') {
      const bytes = Math.ceil(f.bits / 8);
      const scale = f.precision || 1;
      let writeLines = '';
      for (let i = 0; i < bytes; i++) {
        writeLines += `
      buf[offset + ${i}] = (scaledVal >>> ${8 * i}) & 0xFF;`;
      }
      encodeSrc += `
    {
      scaledVal = Math.round(obj["${f.name}"] * ${scale}) | 0;
      ${writeLines}
      offset += ${bytes};
    }
      `;
    } else if (f.type === 'uint') {
      const bytes = Math.ceil(f.bits / 8);
      const scale = f.precision || 1;
      let writeLines = '';
      for (let i = 0; i < bytes; i++) {
        writeLines += `
      buf[offset + ${i}] = (tempVal >>> ${8 * i}) & 0xFF;`;
      }
      encodeSrc += `
    {
      let tempVal = Math.round(obj["${f.name}"] * ${scale}) >>> 0;
      ${writeLines}
      offset += ${bytes};
    }
      `;
    } else {
      throw new Error(`Unknown type "${f.type}" for field "${f.name}"`);
    }
  }

  encodeSrc += `return offset;`;

  let decodeSrc = `
    let offset = 0;
    let temp, rawVal;
  `;

  for (const f of schema) {
    if (f.type === 'varint') {
      decodeSrc += `
    {
      let shift = 0;
      let result = 0;
      let byte;
      do {
        byte = buf[offset++];
        result |= (byte & 0x7F) << shift;
        shift += 7;
      } while (byte & 0x80);
      outObj["${f.name}"] = ((result >>> 1) ^ -(result & 1)) / ${f.precision || 1};
    }
      `;
    } else if (f.type === 'int') {
      const bytes = Math.ceil(f.bits / 8);
      const scale = f.precision || 1;
      const msbMask = 1 << (f.bits - 1);
      const fullMask = (1 << f.bits) - 1;
      let readLines = '';
      for (let i = 0; i < bytes; i++) {
        readLines += `
      rawVal |= buf[offset + ${i}] << ${8 * i};`;
      }
      decodeSrc += `
    {
      rawVal = 0;
      ${readLines}
      if (rawVal & ${msbMask}) {
        rawVal |= ~${fullMask};
      }
      outObj["${f.name}"] = rawVal / ${scale};
      offset += ${bytes};
    }
      `;
    } else if (f.type === 'uint') {
      const bytes = Math.ceil(f.bits / 8);
      const scale = f.precision || 1;
      let readLines = '';
      for (let i = 0; i < bytes; i++) {
        readLines += `
      rawVal |= buf[offset + ${i}] << ${8 * i};`;
      }
      decodeSrc += `
    {
      rawVal = 0;
      ${readLines}
      outObj["${f.name}"] = rawVal / ${scale};
      offset += ${bytes};
    }
      `;
    } else {
      throw new Error(`Unknown type "${f.type}" for field "${f.name}"`);
    }
  }

  decodeSrc += `return outObj;`;

  const encode = new Function('obj', 'buf', encodeSrc);
  const decode = new Function('buf', 'outObj', decodeSrc);

  return {
    encode: (obj) => encode(obj, buf),
    decode: (len) => decode(buf.subarray(0, len), outObj),
    buffer: buf,
    outObj,
  };
}

module.exports = { setup };
