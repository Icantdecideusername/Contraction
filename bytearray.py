import time

# Your schema with bits and type
schema = [
    {"name": "effects", "bits": 12, "type": "uint"},
    {"name": "anim_frame", "bits": 10, "type": "uint"},
    {"name": "item_holding", "bits": 9,  "type": "uint"},
    {"name": "state_flag", "bits": 3,  "type": "uint"},
    {"name": "head_pitch", "bits": 6,  "type": "int"},
    {"name": "head_yaw", "bits": 6,  "type": "int"},
    {"name": "body_dir", "bits": 8,  "type": "uint"},
    {"name": "z", "bits": 32, "type": "int"},
    {"name": "y", "bits": 24, "type": "int"},
    {"name": "x", "bits": 32, "type": "int"},
]

def build_metadata(schema):
    offset = 0
    metadata = []
    for field in schema:
        bits = field["bits"]
        ftype = field["type"]
        metadata.append({
            "name": field["name"],
            "bits": bits,
            "type": ftype,
            "offset": offset,
            "mask": (1 << bits) - 1,
            "sign_mask": (1 << (bits - 1)) if ftype == "int" else 0,
            "wrap_value": (1 << bits) if ftype == "int" else 0,
        })
        offset += bits
    return metadata, offset

field_meta, total_bits = build_metadata(schema)

# Build encode function dynamically
def build_encoder(meta):
    parts = []
    for f in meta:
        name = f["name"]
        bits = f["bits"]
        offset = f["offset"]
        mask = f["mask"]
        ftype = f["type"]
        # handle signed int adjustment before masking in encode
        if ftype == "int":
            # Encode signed int as unsigned via wrap
            # val & mask after wrapping handled in code below
            parts.append(
                f"    val = vals['{name}']\n"
                f"    if val < 0:\n"
                f"        val = (val + (1 << {bits})) & {mask}\n"
                f"    encoded |= (val & {mask}) << {offset}\n"
            )
        else:
            parts.append(
                f"    val = vals['{name}']\n"
                f"    encoded |= (val & {mask}) << {offset}\n"
            )
    func_code = "def encode(vals):\n    encoded = 0\n" + "".join(parts) + "    return encoded\n"
    namespace = {}
    exec(func_code, {}, namespace)
    return namespace["encode"]

# Build decode function dynamically
def build_decoder(meta):
    parts = []
    for f in meta:
        name = f["name"]
        bits = f["bits"]
        offset = f["offset"]
        mask = f["mask"]
        ftype = f["type"]
        sign_mask = f["sign_mask"]
        wrap_value = f["wrap_value"]
        if ftype == "int":
            parts.append(
                f"    val = (encoded >> {offset}) & {mask}\n"
                f"    if val & {sign_mask}:\n"
                f"        val -= {wrap_value}\n"
                f"    result['{name}'] = val\n"
            )
        else:
            parts.append(
                f"    result['{name}'] = (encoded >> {offset}) & {mask}\n"
            )
    func_code = "def decode(encoded):\n    result = {}\n" + "".join(parts) + "    return result\n"
    namespace = {}
    exec(func_code, {}, namespace)
    return namespace["decode"]

encode = build_encoder(field_meta)
decode = build_decoder(field_meta)

# Test values
test_values = {
    "x": -300000000,
    "y": -69420,
    "z": -1234599,
    "body_dir": 215,
    "head_yaw": -30,
    "head_pitch": -23,
    "state_flag": 7,
    "item_holding": 189,
    "anim_frame": 489,
    "effects": 224,
}

# Verify correctness
encoded_val = encode(test_values)
decoded_val = decode(encoded_val)

print(f"Encoded value (bin): {bin(encoded_val)}")
print("Decoded values:")
for k in test_values:
    print(f"  {k}: {decoded_val[k]} (original {test_values[k]})")

# Benchmarking
t = 10_000_000

start = time.time()
for _ in range(t):
    e = encode(test_values)
end = time.time()
print(f"Encode speed: {t / (end - start):,.0f} ops/sec")

start = time.time()
for _ in range(t):
    d = decode(e)
end = time.time()
print(f"Decode speed: {t / (end - start):,.0f} ops/sec")

print(f"Total bits used: {total_bits}, total bytes: {(total_bits / 8)} (round up due to how bytearrays work)")
