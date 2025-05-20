import time

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

def build_encoder(meta):
    # Build lines caching dict lookups into local vars
    cache_lines = []
    encode_lines = []
    for f in meta:
        name = f["name"]
        cache_lines.append(f"    {name} = vals['{name}']")
    encode_lines.append("    encoded = 0")

    for f in meta:
        name = f["name"]
        bits = f["bits"]
        offset = f["offset"]
        mask = f["mask"]
        ftype = f["type"]

        if ftype == "int":
            encode_lines.append(f"    val = {name}")
            encode_lines.append(f"    if val < 0:")
            encode_lines.append(f"        val = (val + (1 << {bits})) & {mask}")
            encode_lines.append(f"    encoded |= (val & {mask}) << {offset}")
        else:
            encode_lines.append(f"    encoded |= ({name} & {mask}) << {offset}")

    encode_lines.append("    return encoded")

    func_code = "def encode(vals):\n" + "\n".join(cache_lines + encode_lines) + "\n"

    namespace = {}
    exec(func_code, {}, namespace)
    return namespace["encode"]

def build_decoder(meta):
    decode_lines = ["    result = {}"]
    for f in meta:
        name = f["name"]
        bits = f["bits"]
        offset = f["offset"]
        mask = f["mask"]
        ftype = f["type"]
        sign_mask = f["sign_mask"]
        wrap_value = f["wrap_value"]

        if ftype == "int":
            decode_lines.append(f"    val = (encoded >> {offset}) & {mask}")
            decode_lines.append(f"    if val & {sign_mask}:")
            decode_lines.append(f"        val -= {wrap_value}")
            decode_lines.append(f"    result['{name}'] = val")
        else:
            decode_lines.append(f"    result['{name}'] = (encoded >> {offset}) & {mask}")

    decode_lines.append("    return result")

    func_code = "def decode(encoded):\n" + "\n".join(decode_lines) + "\n"

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
