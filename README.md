# Contraction (binary encoding)
Binary encoding, specializes in ints and fixed point encoding for up to 32 bits (because Javascript's bitshifts)

Uses a schema precise to the bit level for higher efficiency

Schema example
  { name: "x", bits: 32, type: "int", precision: 100 }, for signed integers of fixed point precision of 2d.p (100x), stored in 32 bits
  
  { name: "y", bits: 24, type: "int", precision: 100 },
  
  { name: "z", bits: 32, type: "int", precision: 100 },
  
  { name: "variable", bits: 8, type: "uint" }, for unsigned integers of fixed point precision of 1, stored in 8 bits
  
  { name: "variable2", bits: 16, type: "uint", precision: 100 }, for unsigned integers of fixed point precision of 2d.p (100x), stored in 16 bits



## Benchmarks
This benchmark is done on an Intel core i5 6300U (a midrange laptop CPU designed in 2015), encoding 10 fields of simulated game data (using Node.js v22.16.0)
Input data
{
  "x": -3000000,
  "y": -694.2,
  "z": -12345.99,
  "body_dir": 215,
  "head_yaw": 30,
  "head_pitch": 41,
  "state_flag": 7,
  "item_holding": 189,
  "anim_frame": 489,
  "effects": 224
}
Output data
{
  "x": -3000000,
  "y": -694.2,
  "z": -12345.99,
  "body_dir": 215,
  "head_yaw": 30,
  "head_pitch": 41,
  "state_flag": 7,
  "item_holding": 189,
  "anim_frame": 489,
  "effects": 224
}
Buffer size: 18 bytes
Encode ops/sec: 17621870.12
Decode ops/sec: 13332913.44
