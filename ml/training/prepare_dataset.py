import os, shutil, random
from pathlib import Path

SRC = Path("datasets/sh17")
DST = Path("datasets/sh17_ready")

img_dir = SRC / "images"
lbl_dir = SRC / "labels"

# Get all images that have a matching label file
images = [f for f in img_dir.iterdir() 
          if f.suffix.lower() in ('.jpg', '.jpeg', '.png')
          and (lbl_dir / f.with_suffix('.txt').name).exists()]

print(f"Found {len(images)} labelled images")

random.seed(42)
random.shuffle(images)

split = int(len(images) * 0.8)
train_imgs = images[:split]
val_imgs = images[split:]

for subset, files in [("train", train_imgs), ("valid", val_imgs)]:
    (DST / subset / "images").mkdir(parents=True, exist_ok=True)
    (DST / subset / "labels").mkdir(parents=True, exist_ok=True)
    for img in files:
        shutil.copy(img, DST / subset / "images" / img.name)
        lbl = lbl_dir / img.with_suffix('.txt').name
        shutil.copy(lbl, DST / subset / "labels" / img.with_suffix('.txt').name)

print(f"Train: {len(train_imgs)} | Val: {len(val_imgs)}")
print(f"Ready at: {DST}")
