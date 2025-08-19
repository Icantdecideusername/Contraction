# Contraction (binary encoding)
Binary encoding, specializes in ints and fixed point encoding

Uses a schema precise to the bit level for higher efficiency

Schema example
  { name: "x", bits: 32, type: "int", precision: 100 }, for signed integers of fixed point precision of 2d.p (100x), stored in 32 bits
  
  { name: "y", bits: 24, type: "int", precision: 100 },
  
  { name: "z", bits: 32, type: "int", precision: 100 },
  
  { name: "variable", bits: 8, type: "uint" }, for unsigned integers of fixed point precision of 1, stored in 8 bits
  
  { name: "variable2", bits: 16, type: "uint", precision: 100 }, for unsigned integers of fixed point precision of 2d.p (100x), stored in 16 bits
