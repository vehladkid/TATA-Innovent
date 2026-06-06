# ml/training

> YOLOv8 training scripts — Owner: Tejvir

## Responsibilities
- YOLOv8n fine-tuning on PPE datasets (SH17, Hard Hat Workers, Pictor-PPE via Roboflow)
- ONNX export with opset 12 + INT8 quantization
- Exported models land at `apps/pwa/public/models/yolov8n-ppe-v{N}.onnx`

## Requirements
- Python 3.11 + CUDA 12 + NVIDIA RTX 4050 (or equivalent)
- `pip install ultralytics`

## Not deployed — runs locally only.
