import time
from collections import namedtuple

# Bit limits (2's complement wraparound values)
BIT_LIMIT_6  = 1 << 6
BIT_LIMIT_8  = 1 << 8
BIT_LIMIT_9  = 1 << 9
BIT_LIMIT_10 = 1 << 10
BIT_LIMIT_12 = 1 << 12
BIT_LIMIT_24 = 1 << 24
BIT_LIMIT_32 = 1 << 32

# Masks
MASK_6  = 0x3F
MASK_8  = 0xFF
MASK_9  = 0x1FF
MASK_10 = 0x3FF
MASK_12 = 0xFFF
MASK_24 = 0xFFFFFF
MASK_32 = 0xFFFFFFFF

# Bit Offsets
effects_offset       = 0
anim_frame_offset    = effects_offset + 12     # 12
item_holding_offset  = anim_frame_offset + 10  # 22
state_flag_offset    = item_holding_offset + 9 # 31
head_pitch_offset    = state_flag_offset + 3   # 34
head_yaw_offset      = head_pitch_offset + 6   # 40
body_dir_offset      = head_yaw_offset + 6     # 46
z_enc_offset         = body_dir_offset + 8     # 54
y_enc_offset         = z_enc_offset + 32       # 86
x_enc_offset         = y_enc_offset + 24       # 110
bit_length           = x_enc_offset + 32       # 142

# Named tuple for fast decoded access
Decoded = namedtuple("Decoded", "x y z body_dir head_yaw head_pitch state_flag item_holding anim_frame effects")

def encode(x, y, z, body_dir, head_yaw, head_pitch, state_flag, item_holding, anim_frame, effects):
    # Scale float positions to fixed point
    x = int(x * 100)
    y = int(y * 100)
    z = int(z * 100)

    if x < 0: x += BIT_LIMIT_32
    if y < 0: y += BIT_LIMIT_24
    if z < 0: z += BIT_LIMIT_32

    head_yaw   += 64
    head_pitch += 64

    if head_yaw < 0: head_yaw += BIT_LIMIT_6
    if head_pitch < 0: head_pitch += BIT_LIMIT_6

    # Pack everything
    return (
        ((x & MASK_32) << x_enc_offset) |
        ((y & MASK_24) << y_enc_offset) |
        ((z & MASK_32) << z_enc_offset) |
        ((body_dir     & MASK_8)  << body_dir_offset) |
        ((head_yaw     & MASK_6)  << head_yaw_offset) |
        ((head_pitch   & MASK_6)  << head_pitch_offset) |
        ((state_flag   & 0x07)    << state_flag_offset) |
        ((item_holding & MASK_9)  << item_holding_offset) |
        ((anim_frame   & MASK_10) << anim_frame_offset) |
        ((effects      & MASK_12) << effects_offset)
    )

def decode(encoded):
    x = (encoded >> x_enc_offset) & MASK_32
    y = (encoded >> y_enc_offset) & MASK_24
    z = (encoded >> z_enc_offset) & MASK_32

    if x >= BIT_LIMIT_32 >> 1: x -= BIT_LIMIT_32
    if y >= BIT_LIMIT_24 >> 1: y -= BIT_LIMIT_24
    if z >= BIT_LIMIT_32 >> 1: z -= BIT_LIMIT_32

    x /= 100
    y /= 100
    z /= 100

    head_yaw   = ((encoded >> head_yaw_offset)   & MASK_6) - 64
    head_pitch = ((encoded >> head_pitch_offset) & MASK_6) - 64

    return Decoded(
        x, y, z,
        (encoded >> body_dir_offset)     & MASK_8,
        head_yaw,
        head_pitch,
        (encoded >> state_flag_offset)   & 0x07,
        (encoded >> item_holding_offset) & MASK_9,
        (encoded >> anim_frame_offset)   & MASK_10,
        (encoded >> effects_offset)      & MASK_12
    )

# === 🧪 Benchmark ===
x, y, z = -3000000.00, -694.20, -12345.99
body_dir, head_yaw, head_pitch = 215, -30, 41
state_flag, item_holding, anim_frame, effects = 7, 189, 489, 0xE0

t = 1_000_000

# Encode benchmark
start_time = time.time()
for _ in range(t):
    encoded_int = encode(x, y, z, body_dir, head_yaw, head_pitch, state_flag, item_holding, anim_frame, effects)
encode_duration = time.time() - start_time

# Decode benchmark
start_time = time.time()
for _ in range(t):
    decoded = decode(encoded_int)
decode_duration = time.time() - start_time

# === 🖨 Output ===
print("\nDecoded binary")
for i, name in enumerate(Decoded._fields):
    print(f"{name.capitalize()}: {decoded[i]} ({decoded[i]})")

print("\nPerformance benchmark")
print(f"Encoded Binary: {bin(encoded_int)}")
print(f"Total encoding/decoding time for {t} items: {encode_duration + decode_duration:.6f} seconds")
print(f"Can encode {t / encode_duration:.2f} items per second")
print(f"Can decode {t / decode_duration:.2f} items per second")
print(f"Length of Binary Output: {bit_length} bits, {bit_length / 8:.2f} bytes")
