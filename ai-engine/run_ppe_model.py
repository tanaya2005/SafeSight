"""
Safe-Sight – Standalone PPE Detector (best.onnx)
=================================================
Runs the YOLOv8 ONNX model (best.onnx) independently on a live webcam feed
to detect Personal Protective Equipment (PPE) items such as:

    helmet, gloves, vest, boots, goggles
    and their MISSING counterparts (violations):
    no_helmet, no_goggle, no_gloves, no_boots

This script is COMPLETELY INDEPENDENT of the existing helmet-detection
pipeline (processor.py / yolo.py). It does NOT import or modify any of
those files.

Usage:
    python run_ppe_model.py                        # default webcam (index 0)
    python run_ppe_model.py --cam 1                # second webcam
    python run_ppe_model.py --video path/to/clip.mp4
    python run_ppe_model.py --model path/to/alt.onnx

Controls:
    Q  – quit
    P  – pause / resume
    S  – toggle confidence score display

Dependencies:
    pip install onnxruntime opencv-python numpy
"""

import os
import sys
import time
import argparse
import collections

import cv2
import numpy as np

# ─── Attempt to import onnxruntime ────────────────────────────────────────────
try:
    import onnxruntime as ort
except ImportError:
    print("[ERROR] onnxruntime is not installed.")
    print("        Run:  pip install onnxruntime")
    sys.exit(1)

# ══════════════════════════════════════════════════════════════════════════════
# Configuration constants
# ══════════════════════════════════════════════════════════════════════════════

# Path to the ONNX model (relative to this script's directory)
BASE_DIR        = os.path.dirname(os.path.abspath(__file__))
DEFAULT_MODEL   = os.path.join(BASE_DIR, "best.onnx")

# YOLOv8 input resolution (must match what the model was trained with)
INPUT_W, INPUT_H = 640, 640

# Detection thresholds
CONF_THRESHOLD   = 0.25     # minimum confidence to keep a detection
NMS_THRESHOLD    = 0.45     # IoU threshold for Non-Max Suppression

# FPS smoothing window
FPS_WINDOW       = 60       # number of frames used for rolling FPS average

# ─── Class definitions ────────────────────────────────────────────────────────
# Map class index → (label, BGR colour)
CLASS_INFO = {
    0:  ("Helmet",     (0,   200,   0)),    # green
    1:  ("Gloves",     (0,   180,  60)),    # lime-green
    2:  ("Vest",       (0,   160, 120)),    # teal-green
    3:  ("Boots",      (0,   140, 180)),    # teal
    4:  ("Goggles",    (0,   200, 200)),    # cyan
    5:  ("None",       (120, 120, 120)),    # grey
    6:  ("Person",     (200, 200, 200)),    # light grey
    7:  ("No Helmet",  (30,   30, 230)),    # red  ← VIOLATION
    8:  ("No Goggles", (30,   80, 230)),    # red-orange  ← VIOLATION
    9:  ("No Gloves",  (30,  130, 230)),    # orange-red  ← VIOLATION
    10: ("No Boots",   (30,  180, 230)),    # orange  ← VIOLATION
}

VIOLATION_IDS = {7, 8, 9, 10}   # class IDs that represent missing PPE


# ══════════════════════════════════════════════════════════════════════════════
# Preprocessing
# ══════════════════════════════════════════════════════════════════════════════

def preprocess(frame: np.ndarray) -> tuple[np.ndarray, float, float]:
    """
    Prepare a BGR frame for YOLOv8 ONNX inference.

    Steps
    -----
    1. Resize to INPUT_W × INPUT_H (letterbox-free, simple resize).
    2. Convert BGR → RGB.
    3. Normalise pixel values to [0, 1].
    4. Transpose to NCHW format:  (H, W, C) → (1, C, H, W).

    Returns
    -------
    blob    : np.ndarray  shape (1, 3, INPUT_H, INPUT_W), dtype float32
    scale_x : float       ratio  original_w / INPUT_W  (for box rescaling)
    scale_y : float       ratio  original_h / INPUT_H
    """
    orig_h, orig_w = frame.shape[:2]

    # Resize
    resized = cv2.resize(frame, (INPUT_W, INPUT_H), interpolation=cv2.INTER_LINEAR)

    # BGR → RGB, then normalise
    rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0

    # HWC → NCHW
    blob = np.expand_dims(np.transpose(rgb, (2, 0, 1)), axis=0)

    scale_x = orig_w / INPUT_W
    scale_y = orig_h / INPUT_H

    return blob, scale_x, scale_y


# ══════════════════════════════════════════════════════════════════════════════
# Postprocessing
# ══════════════════════════════════════════════════════════════════════════════

def postprocess(
    outputs: list,
    scale_x: float,
    scale_y: float,
) -> list[tuple[int, int, int, int, int, float]]:
    """
    Decode raw YOLOv8 ONNX output into bounding boxes.

    YOLOv8 ONNX export shape:  (1, num_attrs, 8400)
    where num_attrs = 4 (cx, cy, w, h) + num_classes

    Returns
    -------
    List of (x1, y1, x2, y2, class_id, confidence) tuples,
    all coordinates scaled back to original frame dimensions.
    """
    # outputs[0]: shape (1, num_attrs, 8400) — squeeze batch dim, transpose
    raw = np.squeeze(outputs[0])        # → (num_attrs, 8400)
    if raw.ndim != 2:
        return []

    preds = raw.T                       # → (8400, num_attrs)

    boxes_xywh = preds[:, :4]           # centre_x, centre_y, w, h  (in model coords)
    class_scores = preds[:, 4:]         # (8400, num_classes)

    max_scores = np.max(class_scores, axis=1)    # (8400,)
    class_ids  = np.argmax(class_scores, axis=1) # (8400,)

    # ── Filter by confidence ──────────────────────────────────────────────────
    keep = max_scores >= CONF_THRESHOLD
    boxes_xywh = boxes_xywh[keep]
    max_scores = max_scores[keep]
    class_ids  = class_ids[keep]

    if len(boxes_xywh) == 0:
        return []

    # ── Convert cx,cy,w,h → x,y,w,h (top-left + size) for OpenCV NMS ────────
    cx, cy, w, h = boxes_xywh[:, 0], boxes_xywh[:, 1], boxes_xywh[:, 2], boxes_xywh[:, 3]
    x = cx - w / 2.0
    y = cy - h / 2.0
    cv_boxes  = np.column_stack((x, y, w, h)).tolist()
    cv_scores = max_scores.tolist()

    # ── Non-Max Suppression ───────────────────────────────────────────────────
    indices = cv2.dnn.NMSBoxes(cv_boxes, cv_scores, CONF_THRESHOLD, NMS_THRESHOLD)

    detections = []
    if len(indices) > 0:
        for i in indices.flatten():
            bx, by, bw, bh = cv_boxes[i]
            cls_id  = int(class_ids[i])
            conf    = float(cv_scores[i])

            # Scale back to original frame coordinates
            x1 = max(0, int(bx * scale_x))
            y1 = max(0, int(by * scale_y))
            x2 = int((bx + bw) * scale_x)
            y2 = int((by + bh) * scale_y)

            detections.append((x1, y1, x2, y2, cls_id, conf))

    return detections


# ══════════════════════════════════════════════════════════════════════════════
# Drawing helpers
# ══════════════════════════════════════════════════════════════════════════════

def draw_detection(
    frame: np.ndarray,
    x1: int, y1: int, x2: int, y2: int,
    cls_id: int, conf: float,
    show_conf: bool = True,
) -> None:
    """
    Draw a single bounding box with a coloured label badge above it.

    Violation classes get a thicker border and a double-ring highlight.
    """
    label, color = CLASS_INFO.get(cls_id, (str(cls_id), (128, 128, 128)))
    is_violation = cls_id in VIOLATION_IDS

    thickness = 3 if is_violation else 2
    cv2.rectangle(frame, (x1, y1), (x2, y2), color, thickness)

    # Extra highlight ring for violations (makes them visually 'pop')
    if is_violation:
        cv2.rectangle(frame, (x1 - 2, y1 - 2), (x2 + 2, y2 + 2), color, 1)

    # Build label text
    tag = f"{label}  {conf:.2f}" if show_conf else label

    # Badge background
    font       = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.52
    font_thick = 1
    (tw, th), baseline = cv2.getTextSize(tag, font, font_scale, font_thick)
    badge_y1 = max(0, y1 - th - 10)
    badge_y2 = y1
    cv2.rectangle(frame, (x1, badge_y1), (x1 + tw + 10, badge_y2), color, -1)
    cv2.putText(
        frame, tag, (x1 + 5, y1 - 5),
        font, font_scale, (255, 255, 255), font_thick, cv2.LINE_AA,
    )


def draw_hud(
    frame: np.ndarray,
    frame_no: int,
    fps: float,
    detections: list,
) -> None:
    """
    Draw top & bottom HUD bars with run statistics.
    """
    h, w = frame.shape[:2]

    # ── Count categories ─────────────────────────────────────────────────────
    ppe_ok_count  = sum(1 for (_, _, _, _, cid, _) in detections if cid not in VIOLATION_IDS and cid != 5)
    violation_count = sum(1 for (_, _, _, _, cid, _) in detections if cid in VIOLATION_IDS)

    # ── TOP BAR ──────────────────────────────────────────────────────────────
    cv2.rectangle(frame, (0, 0), (w, 50), (10, 10, 20), -1)
    cv2.putText(
        frame, "Safe-Sight | PPE Detector  (best.onnx)",
        (12, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (80, 190, 255), 2, cv2.LINE_AA,
    )
    ts = time.strftime("%H:%M:%S")
    cv2.putText(
        frame, f"{ts}  |  {fps:.1f} FPS  |  Frame {frame_no}",
        (w - 320, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.50, (160, 160, 160), 1, cv2.LINE_AA,
    )

    # ── BOTTOM BAR ───────────────────────────────────────────────────────────
    bar_h = 56
    cv2.rectangle(frame, (0, h - bar_h), (w, h), (10, 10, 20), -1)
    cv2.line(frame, (0, h - bar_h), (w, h - bar_h), (40, 40, 60), 1)

    # PPE status row
    status_color = (30, 30, 230) if violation_count > 0 else (80, 200, 80)
    status_text  = (
        f"PPE OK: {ppe_ok_count}    "
        f"Violations: {violation_count}    "
        + ("  ".join(
            CLASS_INFO[cid][0]
            for (_, _, _, _, cid, _) in detections
            if cid in VIOLATION_IDS
        ) or ("All Clear ✔" if violation_count == 0 else ""))
    )
    cv2.putText(
        frame, status_text,
        (12, h - bar_h + 22), cv2.FONT_HERSHEY_SIMPLEX, 0.50, status_color, 1, cv2.LINE_AA,
    )

    # Hint row
    cv2.putText(
        frame, "Q = quit   P = pause/resume   S = toggle scores",
        (12, h - bar_h + 44), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (100, 100, 120), 1, cv2.LINE_AA,
    )

    # LIVE indicator
    cv2.circle(frame, (w - 20, h - 16), 7, (30, 30, 230), -1)
    cv2.putText(
        frame, "LIVE", (w - 58, h - 10),
        cv2.FONT_HERSHEY_SIMPLEX, 0.42, (30, 30, 230), 1, cv2.LINE_AA,
    )


# ══════════════════════════════════════════════════════════════════════════════
# Main detection loop
# ══════════════════════════════════════════════════════════════════════════════

def run(source: int | str = 0, model_path: str = DEFAULT_MODEL) -> None:
    """
    Run the standalone PPE ONNX detection pipeline.

    Parameters
    ----------
    source     : int or str   webcam index or path to a video file
    model_path : str          path to the best.onnx weights file
    """

    # ── Validate model file ───────────────────────────────────────────────────
    if not os.path.isfile(model_path):
        print(f"[ERROR] ONNX model not found: {model_path}")
        print("        Make sure best.onnx is in the ai-engine/ directory.")
        sys.exit(1)

    print("=" * 65)
    print("  Safe-Sight – Standalone PPE ONNX Detector")
    print("=" * 65)
    print(f"  Model   : {model_path}")
    print(f"  Source  : {source}")
    print(f"  Input   : {INPUT_W}×{INPUT_H}")
    print(f"  Conf ≥  : {CONF_THRESHOLD}")
    print(f"  NMS IoU : {NMS_THRESHOLD}")
    print("  Controls: Q = quit | P = pause | S = toggle scores")
    print("=" * 65)

    # ── Load ONNX model ───────────────────────────────────────────────────────
    print("\n📦 Loading ONNX model …")
    try:
        providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
        session   = ort.InferenceSession(model_path, providers=providers)
    except Exception as exc:
        print(f"[ERROR] Failed to load ONNX model: {exc}")
        sys.exit(1)

    input_name  = session.get_inputs()[0].name
    input_shape = session.get_inputs()[0].shape
    print(f"✅ Model loaded.  Input node: '{input_name}'  shape: {input_shape}")

    # Warm-up inference (avoids latency spike on first real frame)
    print("🔥 Running warm-up pass …")
    dummy = np.zeros((1, 3, INPUT_H, INPUT_W), dtype=np.float32)
    session.run(None, {input_name: dummy})
    print("✅ Warm-up complete.\n")

    # ── Open video source ─────────────────────────────────────────────────────
    backend = cv2.CAP_DSHOW if (isinstance(source, int) and os.name == "nt") else cv2.CAP_ANY
    cap = cv2.VideoCapture(source, backend)
    if not cap.isOpened():
        print(f"[ERROR] Cannot open source: {source}")
        sys.exit(1)

    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT,  720)
    cap.set(cv2.CAP_PROP_FPS,            60)
    cap.set(cv2.CAP_PROP_BUFFERSIZE,      1)   # always grab the latest frame

    cam_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    cam_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    print(f"📷 Camera/video opened at {cam_w}×{cam_h}. Starting detection …\n")

    # ── Window ────────────────────────────────────────────────────────────────
    win_name = "Safe-Sight | PPE Detector  [Q=quit  P=pause  S=scores]"
    cv2.namedWindow(win_name, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(win_name, cam_w, cam_h)

    # ── State ─────────────────────────────────────────────────────────────────
    frame_no    = 0
    paused      = False
    show_conf   = True
    fps_times   = collections.deque(maxlen=FPS_WINDOW)
    smooth_fps  = 0.0
    detections  = []           # cached from last inference; reused on every frame

    violation_log_count = 0    # total violations seen (for exit summary)

    # ── Main loop ─────────────────────────────────────────────────────────────
    while True:

        # ── Pause ─────────────────────────────────────────────────────────────
        if paused:
            key = cv2.waitKey(30) & 0xFF
            if key == ord("q"):
                break
            elif key == ord("p"):
                paused = False
                print("[INFO] Resumed.")
            continue

        # ── Grab frame ────────────────────────────────────────────────────────
        ret, frame = cap.read()
        if not ret:
            if isinstance(source, str):
                print("\n📼 End of video file.")
            else:
                print("\n⚠  Camera read failed. Retrying …")
                time.sleep(0.3)
                continue
            break

        frame_no += 1

        # ── Rolling FPS ───────────────────────────────────────────────────────
        now = time.time()
        fps_times.append(now)
        if len(fps_times) >= 2:
            smooth_fps = (len(fps_times) - 1) / (fps_times[-1] - fps_times[0])

        # ── Preprocessing ─────────────────────────────────────────────────────
        blob, scale_x, scale_y = preprocess(frame)

        # ── Inference ─────────────────────────────────────────────────────────
        outputs = session.run(None, {input_name: blob})

        # ── Postprocessing (decode + NMS) ─────────────────────────────────────
        detections = postprocess(outputs, scale_x, scale_y)

        # ── Count & log violations ────────────────────────────────────────────
        violations_this_frame = [(cid, conf) for (_, _, _, _, cid, conf) in detections
                                 if cid in VIOLATION_IDS]
        if violations_this_frame:
            violation_log_count += len(violations_this_frame)
            parts = [f"{CLASS_INFO[cid][0]} ({conf:.2f})"
                     for cid, conf in violations_this_frame]
            print(f"[{time.strftime('%H:%M:%S')}] ⚠  Violations — {', '.join(parts)}")

        # ── Draw bounding boxes ───────────────────────────────────────────────
        for (x1, y1, x2, y2, cls_id, conf) in detections:
            draw_detection(frame, x1, y1, x2, y2, cls_id, conf, show_conf=show_conf)

        # ── Draw HUD ─────────────────────────────────────────────────────────
        draw_hud(frame, frame_no, smooth_fps, detections)

        # ── Display ───────────────────────────────────────────────────────────
        cv2.imshow(win_name, frame)
        key = cv2.waitKey(1) & 0xFF

        if key == ord("q"):
            print("\n👋 Quit requested. Shutting down …")
            break
        elif key == ord("p"):
            paused = True
            print("[INFO] Paused. Press P again to resume.")
        elif key == ord("s"):
            show_conf = not show_conf
            state = "ON" if show_conf else "OFF"
            print(f"[INFO] Confidence scores: {state}")

    # ── Cleanup ───────────────────────────────────────────────────────────────
    cap.release()
    cv2.destroyAllWindows()
    print(f"\n✅ Safe-Sight PPE Detector stopped.")
    print(f"   Total violation detections logged: {violation_log_count}")


# ══════════════════════════════════════════════════════════════════════════════
# CLI entry point
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Safe-Sight – Standalone PPE ONNX Detector (best.onnx)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_ppe_model.py                              # default webcam
  python run_ppe_model.py --cam 1                      # second webcam
  python run_ppe_model.py --video site.mp4             # video file
  python run_ppe_model.py --model custom.onnx          # custom model path
  python run_ppe_model.py --conf 0.4 --nms 0.5        # custom thresholds
        """,
    )
    parser.add_argument(
        "--cam", type=int, default=0,
        help="Webcam device index (default: 0)",
    )
    parser.add_argument(
        "--video", type=str, default=None,
        help="Path to a video file (overrides --cam)",
    )
    parser.add_argument(
        "--model", type=str, default=DEFAULT_MODEL,
        help=f"Path to ONNX model (default: ai-engine/best.onnx)",
    )
    parser.add_argument(
        "--conf", type=float, default=CONF_THRESHOLD,
        help=f"Confidence threshold (default: {CONF_THRESHOLD})",
    )
    parser.add_argument(
        "--nms", type=float, default=NMS_THRESHOLD,
        help=f"NMS IoU threshold (default: {NMS_THRESHOLD})",
    )

    args = parser.parse_args()

    # Allow CLI overrides for thresholds
    CONF_THRESHOLD = args.conf
    NMS_THRESHOLD  = args.nms

    source = args.video if args.video else args.cam
    run(source, model_path=args.model)
