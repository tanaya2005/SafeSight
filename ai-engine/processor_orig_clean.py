"""
Safe-Sight ΓÇô Dual PPE Detection Processor
==========================================
Runs TWO detection models simultaneously on the same video feed:

  MODEL 1 ΓÇô YOLOv3 + DeepSORT  (helmet / person tracking)
            Weights : full_yolo3_helmet_and_person.h5
            Classes : helmet | person with helmet | person without helmet
            Output  : tracked bounding boxes with persistent IDs (top label)

  MODEL 2 ΓÇô YOLOv8  (full construction PPE)
            Weights : best.pt   ΓåÉ drop this file into ai-engine/ when ready
            Classes : helmet, gloves, vest, boots, goggles, none, Person,
                      no_helmet, no_goggle, no_gloves, no_boots
            Output  : direct detection boxes (bottom label) ΓÇö red = violation

If best.pt is not present, Model 2 is silently skipped until the file appears.

Run:
    python processor.py [--cam 0] [--video path/to/video.mp4]
    python processor.py --ppe-model path/to/best.pt

Controls:
    Q  ΓÇô quit
    P  ΓÇô pause / resume

Dependencies (pip):
    pip install -r requirements.txt
"""

import os
import sys
import json
import time
import argparse
import warnings
import collections
import cv2
import numpy as np

warnings.filterwarnings("ignore")

# ΓöÇΓöÇΓöÇ TensorFlow / Keras setup ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
import tensorflow as tf

for _gpu in tf.config.list_physical_devices("GPU"):
    try:
        tf.config.experimental.set_memory_growth(_gpu, True)
    except RuntimeError:
        pass

from tensorflow.keras.models import load_model

# ΓöÇΓöÇΓöÇ Local module imports (all relative to ai-engine/) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
from utils.utils import get_yolo_boxes
from utils.bbox import draw_box_with_id
from object_tracking.application_util import preprocessing          # noqa: F401
from object_tracking.deep_sort import nn_matching
from object_tracking.deep_sort.detection import Detection
from object_tracking.deep_sort.tracker import Tracker
from object_tracking.application_util import generate_detections as gdet

# ΓöÇΓöÇΓöÇ Paths ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, "config.json")
WEIGHTS     = os.path.join(BASE_DIR, "full_yolo3_helmet_and_person.h5")
DEEPSORT_PB = os.path.join(BASE_DIR, "mars-small128.pb")
# YOLOv8 model ΓÇô drop best.pt here when your friend shares it
PPE_V8_DEFAULT_PATH = os.path.join(BASE_DIR, "best.pt")

# ΓöÇΓöÇΓöÇ Model 1 ΓÇô YOLOv3 detection parameters ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
NET_H, NET_W     = 416, 416      # YOLOv3 input size (must be multiple of 32)
OBJ_THRESH       = 0.50
NMS_THRESH       = 0.45
MAX_COS_DISTANCE = 0.30
NMS_MAX_OVERLAP  = 1.0

# ΓöÇΓöÇΓöÇ Model 1 ΓÇô Label definitions (must match config.json order) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
V3_LABEL_NAMES = {
    0: ("helmet",               (0,   200,  0)),    # green
    1: ("person w/ helmet",     (0,   220, 80)),    # light-green
    2: ("person w/o helmet",    (30,   30, 230)),   # red  ΓåÉ VIOLATION
}
V3_VIOLATION_LABEL = 2

# ΓöÇΓöÇΓöÇ Model 2 ΓÇô YOLOv8 PPE class definitions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
PPE_V8_NAMES = {
    0: "helmet",    1: "gloves",    2: "vest",      3: "boots",
    4: "goggles",   5: "none",      6: "Person",    7: "no_helmet",
    8: "no_goggle", 9: "no_gloves", 10: "no_boots",
}
PPE_V8_VIOLATION_IDS = {7, 8, 9, 10}   # classes that represent MISSING PPE
PPE_V8_COLORS = {
    0:  (0,   200,  0),    # helmet      ΓÇô green
    1:  (0,   180, 60),    # gloves      ΓÇô green
    2:  (0,   160, 120),   # vest        ΓÇô teal-green
    3:  (0,   140, 180),   # boots       ΓÇô teal
    4:  (0,   200, 200),   # goggles     ΓÇô cyan
    5:  (120, 120, 120),   # none        ΓÇô grey
    6:  (200, 200, 200),   # Person      ΓÇô light grey
    7:  (30,   30, 230),   # no_helmet   ΓÇô red
    8:  (30,   80, 230),   # no_goggle   ΓÇô red-orange
    9:  (30,  130, 230),   # no_gloves   ΓÇô orange-red
    10: (30,  180, 230),   # no_boots    ΓÇô orange
}
PPE_V8_CONF = 0.45          # detection confidence threshold for YOLOv8

# ΓöÇΓöÇΓöÇ Performance tuning ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
FRAME_SKIP   = 2            # run both YOLO passes every Nth frame; tracker fills gaps
INFER_W      = 640          # resize long-edge to this before Model 1 inference
INFER_H      = 640
FPS_SMOOTH_N = 60           # rolling window for FPS display


# ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
# Helper ΓÇô draw Model 1 (YOLOv3 + DeepSORT) tracked box
# ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
def _draw_v3_track(frame, bbox, track_id: int, label: int):
    """Draw a coloured tracked box from Model 1 (top-left label)."""
    name, color = V3_LABEL_NAMES.get(label, (str(label), (128, 128, 128)))
    x1, y1, x2, y2 = int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3])

    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
    tag = f"M1 #{track_id} {name}"
    (tw, th), _ = cv2.getTextSize(tag, cv2.FONT_HERSHEY_SIMPLEX, 0.50, 1)
    cv2.rectangle(frame, (x1, y1 - th - 8), (x1 + tw + 8, y1), color, -1)
    cv2.putText(frame, tag, (x1 + 4, y1 - 4),
                cv2.FONT_HERSHEY_SIMPLEX, 0.50, (255, 255, 255), 1, cv2.LINE_AA)


# ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
# Helper ΓÇô draw Model 2 (YOLOv8) direct detection box
# ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
def _draw_v8_box(frame, x1, y1, x2, y2, cls_id: int, conf: float):
    """Draw a YOLOv8 PPE detection box (bottom-right label)."""
    color        = PPE_V8_COLORS.get(cls_id, (128, 128, 128))
    name         = PPE_V8_NAMES.get(cls_id, str(cls_id))
    is_violation = cls_id in PPE_V8_VIOLATION_IDS

    # Thicker border for violations to make them pop
    thickness = 3 if is_violation else 2
    cv2.rectangle(frame, (x1, y1), (x2, y2), color, thickness)

    # Extra highlight ring for violations
    if is_violation:
        cv2.rectangle(frame, (x1 - 2, y1 - 2), (x2 + 2, y2 + 2), color, 1)

    # Label drawn at bottom of box so it doesn't clash with Model 1's top label
    tag = f"M2 {name} {conf:.2f}"
    (tw, th), _ = cv2.getTextSize(tag, cv2.FONT_HERSHEY_SIMPLEX, 0.48, 1)
    cv2.rectangle(frame, (x1, y2), (x1 + tw + 8, y2 + th + 8), color, -1)
    cv2.putText(frame, tag, (x1 + 4, y2 + th + 4),
                cv2.FONT_HERSHEY_SIMPLEX, 0.48, (255, 255, 255), 1, cv2.LINE_AA)


# ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
# Helper ΓÇô unified HUD overlay
# ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
def _draw_hud(frame, frame_no: int, fps: float,
              v3_with: int, v3_without: int,
              v8_active: bool, v8_violations: dict):
    """Draw the top and bottom HUD bars covering both model outputs."""
    h, w = frame.shape[:2]

    # ΓöÇΓöÇ TOP BAR ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    cv2.rectangle(frame, (0, 0), (w, 52), (12, 12, 22), -1)
    cv2.putText(frame, "Safe-Sight | Dual PPE Auditor",
                (10, 34), cv2.FONT_HERSHEY_SIMPLEX, 0.78, (80, 190, 255), 2, cv2.LINE_AA)
    ts = time.strftime("%H:%M:%S")
    cv2.putText(frame, f"{ts}  |  {fps:.1f} FPS  |  Frame {frame_no}",
                (w - 310, 34), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (160, 160, 160), 1, cv2.LINE_AA)

    # ΓöÇΓöÇ BOTTOM BAR (two rows) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    bar_h = 76
    cv2.rectangle(frame, (0, h - bar_h), (w, h), (12, 12, 22), -1)

    # Row 1 ΓÇö Model 1 stats
    v3_color  = (30, 30, 230) if v3_without > 0 else (80, 200, 80)
    v3_text   = (f"[M1-YOLOv3]  With Helmet: {v3_with}   "
                 f"Without Helmet: {v3_without}")
    cv2.putText(frame, v3_text, (12, h - bar_h + 22),
                cv2.FONT_HERSHEY_SIMPLEX, 0.50, v3_color, 1, cv2.LINE_AA)

    # Row 2 ΓÇö Model 2 stats (or "waiting" message)
    if v8_active:
        total_v8 = sum(v8_violations.values())
        v8_color = (30, 30, 230) if total_v8 > 0 else (80, 200, 80)
        parts = []
        label_map = {7: "no_helmet", 8: "no_goggle", 9: "no_gloves", 10: "no_boots"}
        for vid, vname in label_map.items():
            cnt = v8_violations.get(vid, 0)
            if cnt:
                parts.append(f"{vname}:{cnt}")
        v2_str = "  ".join(parts) if parts else "All PPE OK"
        v8_text = f"[M2-YOLOv8]  Violations: {total_v8}    {v2_str}"
    else:
        v8_color = (100, 100, 100)
        v8_text  = "[M2-YOLOv8]  Awaiting best.pt ΓÇö drop it in ai-engine/ to activate"

    cv2.putText(frame, v8_text, (12, h - bar_h + 48),
                cv2.FONT_HERSHEY_SIMPLEX, 0.50, v8_color, 1, cv2.LINE_AA)

    # Row 3 ΓÇö LIVE indicator + divider line
    cv2.line(frame, (0, h - bar_h), (w, h - bar_h), (40, 40, 60), 1)
    cv2.circle(frame, (w - 22, h - 18), 7, (30, 30, 230), -1)
    cv2.putText(frame, "LIVE", (w - 58, h - 12),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (30, 30, 230), 1, cv2.LINE_AA)


# ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
# Main detection loop
# ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
def run(source: int | str = 0, ppe_model_path: str = PPE_V8_DEFAULT_PATH):
    """
    Run the dual-model PPE detection pipeline.

    Parameters
    ----------
    source : int or str
        Integer camera index or path to video file.
    ppe_model_path : str
        Path to the YOLOv8 best.pt weights file.
    """

    # ΓöÇΓöÇ Validate required files (Model 1 only ΓÇô Model 2 is optional) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    for path, desc in [(CONFIG_PATH, "config.json"),
                       (WEIGHTS,     "YOLOv3 weights (.h5)"),
                       (DEEPSORT_PB, "DeepSORT encoder (.pb)")]:
        if not os.path.isfile(path):
            print(f"[ERROR] Missing {desc}: {path}")
            sys.exit(1)

    # ΓöÇΓöÇ Load config ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    with open(CONFIG_PATH) as f:
        config = json.load(f)
    anchors = config["model"]["anchors"]
    labels  = config["model"]["labels"]

    print("=" * 65)
    print("  Safe-Sight ΓÇô Dual PPE Detection Engine")
    print("=" * 65)
    print(f"  Source       : {source}")
    print(f"  Model 1      : {os.path.basename(WEIGHTS)}  (YOLOv3 + DeepSORT)")
    print(f"  Model 2      : {os.path.basename(ppe_model_path)}  (YOLOv8 full-PPE)")
    print(f"  Frame skip   : every {FRAME_SKIP} frames")
    print(f"  Infer size   : {INFER_W}├ù{INFER_H}")
    print("  Press Q to quit | P to pause")
    print("=" * 65)

    os.environ.setdefault("CUDA_VISIBLE_DEVICES", config["train"].get("gpus", "0"))

    # ΓöÇΓöÇ Load Model 1 ΓÇô YOLOv3 ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    print("\n≡ƒôª Loading Model 1 ΓÇô YOLOv3 weights ΓÇª")
    try:
        infer_model = load_model(WEIGHTS)
        print("Γ£à YOLOv3 model loaded\n")
    except Exception as exc:
        print(f"Γ¥î Failed to load YOLOv3 model: {exc}")
        sys.exit(1)

    # ΓöÇΓöÇ Load Model 2 ΓÇô YOLOv8 (optional) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    ppe_v8_model = None
    print("≡ƒôª Loading Model 2 ΓÇô YOLOv8 full-PPE model ΓÇª")
    if os.path.isfile(ppe_model_path):
        try:
            from ultralytics import YOLO as UltralyticsYOLO
            ppe_v8_model = UltralyticsYOLO(ppe_model_path)
            # Warm-up pass so first real frame isn't slow
            dummy = np.zeros((INFER_H, INFER_W, 3), dtype=np.uint8)
            ppe_v8_model(dummy, conf=PPE_V8_CONF, verbose=False)
            print(f"Γ£à YOLOv8 model loaded: {os.path.basename(ppe_model_path)}\n")
        except ImportError:
            print("ΓÜá∩╕Å  ultralytics not installed ΓåÆ pip install ultralytics")
            print("   Model 2 (full PPE) will be disabled.\n")
        except Exception as exc:
            print(f"ΓÜá∩╕Å  Could not load YOLOv8 model: {exc}")
            print("   Model 2 (full PPE) will be disabled.\n")
    else:
        print(f"ΓÜá∩╕Å  {os.path.basename(ppe_model_path)} not found in ai-engine/")
        print("   Drop best.pt here to enable vest / gloves / boots detection.\n")

    # ΓöÇΓöÇ Set up DeepSORT tracker (for Model 1) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    print("≡ƒôª Initialising DeepSORT tracker ΓÇª")
    encoder = gdet.create_box_encoder(DEEPSORT_PB, batch_size=1)
    metric  = nn_matching.NearestNeighborDistanceMetric(
                  "cosine", MAX_COS_DISTANCE, None)
    tracker = Tracker(metric)
    print("Γ£à Tracker ready\n")

    # ΓöÇΓöÇ Open video source ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    backend = cv2.CAP_DSHOW if (isinstance(source, int) and os.name == "nt") else cv2.CAP_ANY
    cap = cv2.VideoCapture(source, backend)
    if not cap.isOpened():
        print(f"Γ¥î Cannot open source: {source}")
        sys.exit(1)

    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    cap.set(cv2.CAP_PROP_FPS, 60)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)    # always read the latest frame

    actual_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    actual_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    print(f"≡ƒô╖ Camera opened at {actual_w}├ù{actual_h}. Starting detection ΓÇª\n")

    win_name = "Safe-Sight | Dual PPE Detection  [Q=quit  P=pause]"
    cv2.namedWindow(win_name, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(win_name, actual_w, actual_h)

    # ΓöÇΓöÇ State ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    frame_no         = 0
    total_violations = 0
    paused           = False
    fps_times        = collections.deque(maxlen=FPS_SMOOTH_N)
    smooth_fps       = 0.0

    # Cached detections from last inference frame (reused on skipped frames)
    v3_boxes        = []        # BoundBox list from get_yolo_boxes
    v8_detections   = []        # list of (x1,y1,x2,y2,cls_id,conf)

    while True:
        # ΓöÇΓöÇ Pause handling ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
        if paused:
            key = cv2.waitKey(30) & 0xFF
            if key == ord("q"):
                break
            if key == ord("p"):
                paused = False
            continue

        ret, frame = cap.read()
        if not ret:
            if isinstance(source, str):
                print("\n≡ƒô╝ End of video file.")
            else:
                print("\nΓÜá  Camera read failed. Retrying ΓÇª")
                time.sleep(0.3)
                continue
            break

        frame_no += 1

        # ΓöÇΓöÇ Rolling FPS ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
        now = time.time()
        fps_times.append(now)
        if len(fps_times) >= 2:
            smooth_fps = (len(fps_times) - 1) / (fps_times[-1] - fps_times[0])

        # ΓöÇΓöÇ INFERENCE (every FRAME_SKIP frames) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
        run_inference = (frame_no % FRAME_SKIP == 0)

        if run_inference:
            orig_h, orig_w = frame.shape[:2]

            # Downscale for faster inference
            infer_frame = (cv2.resize(frame, (INFER_W, INFER_H))
                           if (orig_w != INFER_W or orig_h != INFER_H)
                           else frame)

            # ΓöÇΓöÇ Model 1: YOLOv3 ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
            raw_boxes = get_yolo_boxes(
                infer_model, [infer_frame], NET_H, NET_W, anchors, OBJ_THRESH, NMS_THRESH
            )[0]

            # Scale boxes back to original frame dimensions
            sx, sy = orig_w / INFER_W, orig_h / INFER_H
            for b in raw_boxes:
                b.xmin = int(b.xmin * sx)
                b.xmax = int(b.xmax * sx)
                b.ymin = int(b.ymin * sy)
                b.ymax = int(b.ymax * sy)
            v3_boxes = raw_boxes

            # ΓöÇΓöÇ Model 2: YOLOv8 ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
            if ppe_v8_model is not None:
                v8_results = ppe_v8_model(infer_frame, conf=PPE_V8_CONF, verbose=False)[0]
                raw_v8 = []
                for box in v8_results.boxes:
                    cls  = int(box.cls[0])
                    conf = float(box.conf[0])
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                    # Scale back to original frame coordinates
                    x1 = int(x1 * sx);  x2 = int(x2 * sx)
                    y1 = int(y1 * sy);  y2 = int(y2 * sy)
                    raw_v8.append((x1, y1, x2, y2, cls, conf))
                v8_detections = raw_v8
        # else: both model caches reused ΓåÆ tracker still updates below

        # ΓöÇΓöÇ Build + update DeepSORT (Model 1) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
        ds_boxes, ds_scores, ds_labels = [], [], []
        for box in v3_boxes:
            bw = box.xmax - box.xmin
            bh = box.ymax - box.ymin
            if bw <= 0 or bh <= 0:
                continue
            ds_boxes.append([box.xmin, box.ymin, bw, bh])
            ds_scores.append(box.get_score())
            ds_labels.append(box.label)

        features   = encoder(frame, ds_boxes) if ds_boxes else []
        detections = [
            Detection(ds_boxes[i], ds_scores[i], features[i], ds_labels[i])
            for i in range(len(ds_boxes))
        ]
        tracker.predict()
        tracker.update(detections)

        # ΓöÇΓöÇ Draw Model 1 confirmed tracks ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
        n_v3_with    = 0
        n_v3_without = 0
        for track in tracker.tracks:
            if not track.is_confirmed() or track.time_since_update > 1:
                continue
            lbl = track.label
            if lbl == V3_VIOLATION_LABEL:
                n_v3_without += 1
            elif lbl in (0, 1):
                n_v3_with += 1
            _draw_v3_track(frame, track.to_tlbr(), track.track_id, lbl)

        # ΓöÇΓöÇ Log Model 1 violations ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
        if n_v3_without > 0:
            total_violations += n_v3_without
            print(
                f"[{time.strftime('%H:%M:%S')}] ΓÜá [M1] "
                f"{n_v3_without} person(s) without helmet "
                f"(total: {total_violations})"
            )

        # ΓöÇΓöÇ Draw Model 2 detections ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
        v8_violation_counts = {}   # {cls_id: count} for HUD
        for (x1, y1, x2, y2, cls_id, conf) in v8_detections:
            _draw_v8_box(frame, x1, y1, x2, y2, cls_id, conf)
            if cls_id in PPE_V8_VIOLATION_IDS:
                v8_violation_counts[cls_id] = v8_violation_counts.get(cls_id, 0) + 1

        # ΓöÇΓöÇ Log Model 2 violations ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
        if v8_violation_counts:
            label_map = {7: "no_helmet", 8: "no_goggle", 9: "no_gloves", 10: "no_boots"}
            parts = [f"{label_map[k]}├ù{v}" for k, v in v8_violation_counts.items()]
            print(
                f"[{time.strftime('%H:%M:%S')}] ΓÜá  [M2] PPE violation ΓÇô "
                + ", ".join(parts)
            )

        # ΓöÇΓöÇ Draw unified HUD ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
        _draw_hud(
            frame, frame_no, smooth_fps,
            n_v3_with, n_v3_without,
            v8_active=(ppe_v8_model is not None),
            v8_violations=v8_violation_counts,
        )

        # ΓöÇΓöÇ Display ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
        cv2.imshow(win_name, frame)
        key = cv2.waitKey(1) & 0xFF
        if key == ord("q"):
            print("\n≡ƒæï Quit requested. Shutting down ΓÇª")
            break
        if key == ord("p"):
            paused = True
            print("[INFO] Paused. Press P again to resume.")

    cap.release()
    cv2.destroyAllWindows()
    print(f"\nΓ£à Safe-Sight stopped.  Total Model-1 violations logged: {total_violations}")


# ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
# CLI entry point
# ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Safe-Sight Dual PPE Detection Engine",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python processor.py                             # default webcam
  python processor.py --cam 1                     # second webcam
  python processor.py --video site.mp4            # video file
  python processor.py --ppe-model best.pt         # custom YOLOv8 path
        """
    )
    parser.add_argument(
        "--cam", type=int, default=0,
        help="Webcam device index (default: 0)"
    )
    parser.add_argument(
        "--video", type=str, default=None,
        help="Path to a video file (overrides --cam)"
    )
    parser.add_argument(
        "--ppe-model", type=str, default=PPE_V8_DEFAULT_PATH,
        help=f"Path to YOLOv8 best.pt (default: ai-engine/best.pt)"
    )
    args = parser.parse_args()

    source = args.video if args.video else args.cam
    run(source, ppe_model_path=args.ppe_model)
