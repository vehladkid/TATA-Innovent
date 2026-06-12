import os, shutil, random
from pathlib import Path

UNIFIED_CLASSES = ["Hardhat","NO-Hardhat","Safety Vest","NO-Safety Vest","Person","Excavator","Ladder","Gloves","Mask"]

MAPPINGS = {
    "helmet_vest": {
        "img_dir": "datasets/helmet_vest/image/image",
        "lbl_dir": "datasets/helmet_vest/labels/labels",
        "class_map": {0: 0, 1: 1},
    },
    "sh17": {
        "img_dir": "datasets/sh17_ready/train/images",
        "lbl_dir": "datasets/sh17_ready/train/labels",
        "class_map": {0:5, 1:7, 2:0, 3:6, 4:8, 5:1, 6:-1, 7:3, 8:4, 9:-1, 10:-1, 11:2, 12:-1, 13:-1, 14:-1, 15:-1, 16:-1, 17:-1, 18:-1, 19:-1, 20:-1, 21:-1, 22:-1, 23:-1, 24:-1},
    },
    "hard_hat_universe": {
        "img_dir": "datasets/raw/hard_hat_universe/train/images",
        "lbl_dir": "datasets/raw/hard_hat_universe/train/labels",
        "class_map": {0: 0, 1: 2},
    },
}

OUTPUT_DIR = Path("datasets/merged")
TRAIN_RATIO = 0.85
RANDOM_SEED = 42

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

def merge():
    random.seed(RANDOM_SEED)
    for split in ["train", "valid"]:
        (OUTPUT_DIR / split / "images").mkdir(parents=True, exist_ok=True)
        (OUTPUT_DIR / split / "labels").mkdir(parents=True, exist_ok=True)

    all_samples = []

    for name, cfg in MAPPINGS.items():
        img_dir = Path(cfg["img_dir"])
        lbl_dir = Path(cfg["lbl_dir"])
        if not img_dir.exists():
            print(f"SKIP {name} - not found: {img_dir}")
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
            all_samples.append((img, lines))
            added += 1
        print(f"{name}: {added} added, {skipped} skipped")

    random.shuffle(all_samples)
    split_idx = int(len(all_samples) * TRAIN_RATIO)
    train_s = all_samples[:split_idx]
    val_s = all_samples[split_idx:]
    print(f"\nTotal: {len(all_samples)} | Train: {len(train_s)} | Val: {len(val_s)}")

    for split_name, samples in [("train", train_s), ("valid", val_s)]:
        for img, lines in samples:
            # Prefix with source dataset name to prevent silent overwrites when two
            # datasets contain same-named files (e.g. img_001.jpg in both sh17 and helmet_vest).
            dataset_name = img.parent.parent.parent.name
            dest_stem = f"{dataset_name}_{img.stem}"
            shutil.copy2(img, OUTPUT_DIR / split_name / "images" / f"{dest_stem}{img.suffix}")
            with open(OUTPUT_DIR / split_name / "labels" / f"{dest_stem}.txt", "w") as f:
                f.write("\n".join(lines))

    yaml = f"path: {OUTPUT_DIR.absolute()}\ntrain: train/images\nval: valid/images\nnc: {len(UNIFIED_CLASSES)}\nnames:\n"
    for i, n in enumerate(UNIFIED_CLASSES):
        yaml += f"  {i}: {n}\n"
    with open(OUTPUT_DIR / "data.yaml", "w") as f:
        f.write(yaml)

    print(f"\nClass distribution (train):")
    counts = {}
    for _, lines in train_s:
        for line in lines:
            c = int(line.split()[0])
            counts[c] = counts.get(c, 0) + 1
    for c, n in sorted(counts.items()):
        print(f"  {c} {UNIFIED_CLASSES[c]}: {n}")
    print(f"\nDone! Dataset at: {OUTPUT_DIR}")

if __name__ == "__main__":
    merge()
