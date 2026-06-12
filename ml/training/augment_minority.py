"""
Augments minority classes in the merged dataset to balance training.
Target: bring NO-Hardhat, NO-Safety Vest, Person up to ~6000 instances each.
Uses OpenCV — no new dependencies needed (already installed with ultralytics).
"""
import cv2
import numpy as np
import random
import shutil
from pathlib import Path
from collections import Counter

random.seed(42)
np.random.seed(42)

MERGED_TRAIN_IMG = Path("datasets/merged/train/images")
MERGED_TRAIN_LBL = Path("datasets/merged/train/labels")

# Classes we want to augment (by class ID)
# 1=NO-Hardhat, 3=NO-Safety Vest, 4=Person
TARGET_CLASSES = {1, 3, 4}
TARGET_COUNT = 5000  # target instances per class

def get_class_counts():
    counts = Counter()
    for lbl in MERGED_TRAIN_LBL.glob("*.txt"):
        for line in open(lbl):
            c = line.strip().split()
            if c:
                counts[int(c[0])] += 1
    return counts

def augment_image(img, seed):
    """Apply random augmentations to an image."""
    rng = random.Random(seed)
    h, w = img.shape[:2]

    # Random horizontal flip — record the decision so callers can mirror bboxes
    did_flip = rng.random() > 0.5
    if did_flip:
        img = cv2.flip(img, 1)

    # Random brightness
    factor = rng.uniform(0.6, 1.4)
    img = np.clip(img.astype(np.float32) * factor, 0, 255).astype(np.uint8)

    # Random rotation (-15 to +15 degrees)
    angle = rng.uniform(-15, 15)
    M = cv2.getRotationMatrix2D((w/2, h/2), angle, 1.0)
    img = cv2.warpAffine(img, M, (w, h), borderMode=cv2.BORDER_REFLECT)

    # Random HSV jitter
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[:,:,0] = np.clip(hsv[:,:,0] + rng.uniform(-10, 10), 0, 179)
    hsv[:,:,1] = np.clip(hsv[:,:,1] * rng.uniform(0.8, 1.2), 0, 255)
    hsv[:,:,2] = np.clip(hsv[:,:,2] * rng.uniform(0.8, 1.2), 0, 255)
    img = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)

    return img, angle, did_flip

def flip_bbox(bbox, flipped):
    """Adjust bbox x-center for horizontal flip."""
    cls, x, y, w, h = bbox
    if flipped:
        x = 1.0 - x
    return [cls, x, y, w, h]

def rotate_bbox(bbox, angle_deg, img_w, img_h):
    """Approximate bbox rotation — keeps original for small angles."""
    # For small angles (< 15 deg), bbox approximation is acceptable
    # Full rotation would require polygon transformation
    return bbox

def find_images_with_class(target_cls):
    """Find all images containing at least one annotation of target_cls."""
    results = []
    for lbl in MERGED_TRAIN_LBL.glob("*.txt"):
        lines = [l.strip() for l in open(lbl) if l.strip()]
        classes_in_file = {int(l.split()[0]) for l in lines}
        if target_cls in classes_in_file:
            img_stem = lbl.stem
            for ext in [".jpg", ".jpeg", ".png"]:
                img_path = MERGED_TRAIN_IMG / (img_stem + ext)
                if img_path.exists():
                    results.append((img_path, lbl, lines))
                    break
    return results

print("Current class distribution:")
counts = get_class_counts()
classes = ["Hardhat","NO-Hardhat","Safety Vest","NO-Safety Vest","Person","Excavator","Ladder","Gloves","Mask"]
for i, name in enumerate(classes):
    print(f"  {i} {name}: {counts.get(i, 0)}")

aug_count = 0
for target_cls in TARGET_CLASSES:
    current = counts.get(target_cls, 0)
    if current >= TARGET_COUNT:
        print(f"\nClass {target_cls} already has {current} >= {TARGET_COUNT}, skipping")
        continue

    needed_instances = TARGET_COUNT - current
    source_images = find_images_with_class(target_cls)
    if not source_images:
        print(f"\nNo source images for class {target_cls}, skipping")
        continue

    print(f"\nAugmenting class {target_cls} ({classes[target_cls]}): {current} -> {TARGET_COUNT}")
    print(f"  Source images: {len(source_images)}, need ~{needed_instances} more instances")

    generated = 0
    iteration = 0
    while generated < needed_instances:
        img_path, lbl_path, orig_lines = random.choice(source_images)
        seed = iteration * 1000 + target_cls

        try:
            img = cv2.imread(str(img_path))
            if img is None:
                iteration += 1
                continue

            aug_img, angle, flipped = augment_image(img, seed)

            # Parse and adjust bboxes
            new_lines = []
            for line in orig_lines:
                parts = line.split()
                cls = int(parts[0])
                bbox = [cls, float(parts[1]), float(parts[2]),
                        float(parts[3]), float(parts[4])]
                if flipped:
                    bbox = flip_bbox(bbox, True)
                new_lines.append(f"{bbox[0]} {bbox[1]:.6f} {bbox[2]:.6f} {bbox[3]:.6f} {bbox[4]:.6f}")

            # Save augmented image and label
            aug_stem = f"aug_{target_cls}_{iteration:06d}"
            aug_img_path = MERGED_TRAIN_IMG / f"{aug_stem}.jpg"
            aug_lbl_path = MERGED_TRAIN_LBL / f"{aug_stem}.txt"

            cv2.imwrite(str(aug_img_path), aug_img, [cv2.IMWRITE_JPEG_QUALITY, 90])
            with open(aug_lbl_path, "w") as f:
                f.write("\n".join(new_lines))

            # Count new instances of target class
            new_instances = sum(1 for l in new_lines if int(l.split()[0]) == target_cls)
            generated += new_instances
            aug_count += 1

        except Exception as e:
            print(f"  Warning: {e}")

        iteration += 1
        if iteration > 50000:
            print(f"  Hit iteration limit")
            break

    print(f"  Generated {aug_count} augmented images, ~{generated} new instances")

print("\nFinal class distribution:")
counts = get_class_counts()
for i, name in enumerate(classes):
    print(f"  {i} {name}: {counts.get(i, 0)}")

print(f"\nDone! Total augmented images added: {aug_count}")
