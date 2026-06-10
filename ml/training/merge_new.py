"""
Adds new datasets to existing merged dataset.
Does NOT re-merge existing data — only adds new images.
"""
import shutil, random
from pathlib import Path
from collections import Counter

random.seed(42)

MERGED_TRAIN_IMG = Path("datasets/merged/train/images")
MERGED_TRAIN_LBL = Path("datasets/merged/train/labels")
MERGED_VAL_IMG = Path("datasets/merged/valid/images")
MERGED_VAL_LBL = Path("datasets/merged/valid/labels")

TRAIN_RATIO = 0.85

# New datasets to add
# Format: (img_dir, lbl_dir, class_map)
# class_map: {original_id: unified_id}, -1 = skip
NEW_DATASETS = {
    "mask1": {
        "img_dir": "datasets/new/mask1/train/images",
        "lbl_dir": "datasets/new/mask1/train/labels",
        "class_map": {0: -1, 1: 8, 2: -1},  # with_mask → Mask
    },
    "mask2": {
        "img_dir": "datasets/new/mask2/train/images",
        "lbl_dir": "datasets/new/mask2/train/labels",
        "class_map": {0: -1, 1: 8, 2: -1},
    },
    "mask3": {
        "img_dir": "datasets/new/mask3/train/images",
        "lbl_dir": "datasets/new/mask3/train/labels",
        "class_map": {0: -1, 1: 8, 2: -1},
    },
    "mask4": {
        "img_dir": "datasets/new/mask4/train/images",
        "lbl_dir": "datasets/new/mask4/train/labels",
        "class_map": {0: -1, 1: 8, 2: -1},
    },
    "css_v7": {
        "img_dir": "datasets/new/css_v7/train/images",
        "lbl_dir": "datasets/new/css_v7/train/labels",
        "class_map": {
            0: 7,   # Gloves
            1: 0,   # Hardhat
            2: 8,   # Mask
            3: 1,   # NO-Hardhat
            4: -1,  # NO-Mask skip
            5: 3,   # NO-Safety Vest
            6: 4,   # Person
            7: -1,  # Safety Shoes skip
            8: 2,   # Safety Vest
        },
    },
    "css_v1": {
        "img_dir": "datasets/new/css_v1/train/images",
        "lbl_dir": "datasets/new/css_v1/train/labels",
        "class_map": {
            0: -1,  # Barricade skip
            1: -1,  # Dumpster skip
            2: 5,   # EXCAVATORS → Excavator
            3: 7,   # Gloves
            4: 0,   # Hardhat
            5: 8,   # Mask
            6: 1,   # NO-Hardhat
            7: -1,  # NO-Mask skip
            8: 3,   # NO-Safety Vest
            9: 4,   # Person
            10: -1, # Safety Net skip
            11: -1, # Safety Shoes skip
            12: 2,  # Safety Vest
            13: -1, # dump truck skip
            14: -1, # mini-van skip
            15: -1, # truck skip
            16: -1, # wheel loader skip
        },
    },
}

def process_label(lbl_path, class_map):
    lines = []
    try:
        for line in open(lbl_path):
            line = line.strip()
            if not line:
                continue
            parts = line.split()
            new_cls = class_map.get(int(parts[0]), -1)
            if new_cls == -1:
                continue
            parts[0] = str(new_cls)
            lines.append(" ".join(parts))
    except Exception as e:
        print(f"Warning: {lbl_path}: {e}")
    return lines

total_added = 0
for name, cfg in NEW_DATASETS.items():
    img_dir = Path(cfg["img_dir"])
    lbl_dir = Path(cfg["lbl_dir"])
    if not img_dir.exists():
        print(f"SKIP {name} - not found")
        continue

    images = list(img_dir.glob("*.jpg")) + list(img_dir.glob("*.jpeg")) + list(img_dir.glob("*.png"))
    added = skipped = 0

    for img in images:
        lbl = lbl_dir / (img.stem + ".txt")
        if not lbl.exists():
            skipped += 1
            continue
        lines = process_label(lbl, cfg["class_map"])
        if not lines:
            skipped += 1
            continue

        # 85% train, 15% val
        split = "train" if random.random() < TRAIN_RATIO else "valid"
        dst_img = (MERGED_TRAIN_IMG if split == "train" else MERGED_VAL_IMG) / img.name
        dst_lbl = (MERGED_TRAIN_LBL if split == "train" else MERGED_VAL_LBL) / (img.stem + ".txt")

        shutil.copy2(img, dst_img)
        with open(dst_lbl, "w") as f:
            f.write("\n".join(lines))
        added += 1

    print(f"{name}: {added} added, {skipped} skipped")
    total_added += added

print(f"\nTotal new images added: {total_added}")

# Final class distribution
classes = ["Hardhat","NO-Hardhat","Safety Vest","NO-Safety Vest","Person","Excavator","Ladder","Gloves","Mask"]
counts = Counter()
for lbl in MERGED_TRAIN_LBL.glob("*.txt"):
    for line in open(lbl):
        c = line.strip().split()
        if c:
            counts[int(c[0])] += 1

print("\nFinal class distribution (train):")
for i, name in enumerate(classes):
    print(f"  {i} {name}: {counts.get(i, 0)}")
