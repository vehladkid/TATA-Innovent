from ultralytics import YOLO

model = YOLO("yolov8s.pt")

results = model.train(
    data="datasets/merged/data.yaml",
    epochs=150,
    imgsz=640,
    batch=16,
    device=0,
    patience=25,
    workers=4,
    project="runs",
    name="ppe_v2_merged",
    pretrained=True,
    optimizer="AdamW",
    lr0=0.001,
    lrf=0.01,
    cache='disk',
    plots=True,
    save=True,
    hsv_h=0.015,
    hsv_s=0.7,
    hsv_v=0.4,
    degrees=10.0,
    translate=0.1,
    scale=0.5,
    fliplr=0.5,
    mosaic=1.0,
    mixup=0.1,
    copy_paste=0.1,
)

print("\n=== Training Complete ===")
print(f"Best mAP50:    {results.results_dict.get('metrics/mAP50(B)', 'N/A'):.3f}")
print(f"Best mAP50-95: {results.results_dict.get('metrics/mAP50-95(B)', 'N/A'):.3f}")
