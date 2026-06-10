import os
from roboflow import Roboflow

api_key = os.getenv("ROBOFLOW_API_KEY", "")
if not api_key:
    raise ValueError("ROBOFLOW_API_KEY not set. Check your .env file.")

rf = Roboflow(api_key=api_key)

print("Downloading Construction Site Safety (SH17) dataset...")
project = rf.workspace("roboflow-universe-projects").project("construction-site-safety")
dataset = project.version(30).download("yolov8", location="datasets/sh17")
print("Done. Saved to datasets/sh17/")
