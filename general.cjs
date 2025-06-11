'use strict';

// Precompute powers of two for up to 53 bits
const POW2 = new Uint32Array(54);
POW2[0] = 1;
for (let i = 1; i <= 53; i++) POW2[i] = POW2[i - 1] * 2;

const BUFFER_SIZE = 128;

function writeBits(view, bitOffset, value, bits) {
  let bytePos = bitOffset >> 3;
  let bitInByte = bitOffset & 7;
  let bitsLeft = bits;

  while (bitsLeft > 0) {
    const chunkSize = Math.min(8 - bitInByte, bitsLeft);
    const mask = (1 << chunkSize) - 1;
    const shiftBits = bitsLeft - chunkSize;
    const chunk = (value >> shiftBits) & mask;

    view[bytePos] = (view[bytePos] & ~(mask << bitInByte)) | (chunk << bitInByte);

    bitsLeft -= chunkSize;
    bitOffset += chunkSize;
    bytePos = bitOffset >> 3;
    bitInByte = bitOffset & 7;
  }

  return bitOffset;
}

function readBits(view, bitOffset, bits) {
  let bytePos = bitOffset >> 3;
  let bitInByte = bitOffset & 7;
  let bitsLeft = bits;
  let result = 0;

  while (bitsLeft > 0) {
    const chunkSize = Math.min(8 - bitInByte, bitsLeft);
    const mask = (1 << chunkSize) - 1;
    const chunk = (view[bytePos] >> bitInByte) & mask;

    result = (result << chunkSize) | chunk;

    bitsLeft -= chunkSize;
    bitOffset += chunkSize;
    bytePos = bitOffset >> 3;
    bitInByte = bitOffset & 7;
  }

  return result;
}

function setupCodegen(schema) {
  const buffer = new ArrayBuffer(BUFFER_SIZE);
  const view = new Uint8Array(buffer);
  const dataView = new DataView(buffer);
  const outObj = {};

  let encodeBody = 'let bitOffset=0;view.fill(0);';
  let decodeBody = 'let bitOffset=0;';

  for (const field of schema) {
    const n = field.name;
    const p = field.precision || 1;
    if (field.type === 'uint') {
      encodeBody += `bitOffset=writeBits(view,bitOffset,Math.round(obj.${n}*${p}),${field.bits});`;
      decodeBody += `outObj.${n}=readBits(view,bitOffset,${field.bits})/${p};bitOffset+=${field.bits};`;
    } else if (field.type === 'int') {
      encodeBody += `let v_${n}=Math.round(obj.${n}*${p});if(v_${n}<0)v_${n}+=POW2[${field.bits}];bitOffset=writeBits(view,bitOffset,v_${n},${field.bits});`;
      decodeBody += `let r_${n}=readBits(view,bitOffset,${field.bits});if(r_${n}>=POW2[${field.bits-1}])r_${n}-=POW2[${field.bits}];outObj.${n}=r_${n}/${p};bitOffset+=${field.bits};`;
    } else if (field.type === 'varint') {
      encodeBody += `let v_${n}=Math.round(obj.${n}*${p});v_${n}=v_${n}>=0?v_${n}*2:(-v_${n})*2-1;while(1){let b=v_${n}&0x7F;v_${n}>>>=7;dataView.setUint8(bitOffset>>3,v_${n}>0?(b|0x80):b);bitOffset+=8;if(v_${n}===0)break;}`;
      decodeBody += `let r_${n}=0,s_${n}=0;while(1){let b=dataView.getUint8(bitOffset>>3);bitOffset+=8;r_${n}|=(b&0x7F)<<s_${n};if((b&0x80)===0)break;s_${n}+=7;}outObj.${n}=(r_${n}&1)?-((r_${n}+1)>>>1):(r_${n}>>>1);outObj.${n}/=${p};`;
    } else {
      throw new Error('Unknown type: ' + field.type);
    }
  }

  const encode = new Function('obj', 'view', 'dataView', 'writeBits', 'POW2', encodeBody + 'return Math.ceil(bitOffset/8);');
  const decode = new Function('view', 'dataView', 'readBits', 'POW2', 'outObj', decodeBody + 'return outObj;');

  return {
    encode(obj) { return encode(obj, view, dataView, writeBits, POW2); },
    decode() { return decode(view, dataView, readBits, POW2, outObj); },
    buffer,
    outObj,
  };
}

module.exports = { setup: setupCodegen };
