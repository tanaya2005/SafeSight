import os
import sys
import io
import json
import time
import base64
import threading
import collections
import cv2
import numpy as np
import requests
from flask import Flask, Response, jsonify, request, send_file
from flask_cors import CORS
from gtts import gTTS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# TensorFlow / Keras setup
import warnings
warnings.filterwarnings('ignore')
import tensorflow as tf
from tensorflow.keras.models import load_model

# Local module imports
from utils.utils import get_yolo_boxes
from object_tracking.deep_sort import nn_matching
from object_tracking.deep_sort.detection import Detection
from object_tracking.deep_sort.tracker import Tracker
from object_tracking.application_util import generate_detections as gdet

# ─── Configuration ────────────────────────────────────────────────────────────
BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH  = os.path.join(BASE_DIR, "config.json")
WEIGHTS_V3   = os.path.join(BASE_DIR, "full_yolo3_helmet_and_person.h5")
DEEPSORT_PB  = os.path.join(BASE_DIR, "mars-small128.pb")
WEIGHTS_V8   = os.path.join(BASE_DIR, "best.pt")
API_BASE_URL = "http://localhost:5000/api"

CAMERA_INDEX      = int(os.getenv('CAM_PPE_INDEX', 0))  # Use env variable or default to 0
NET_H, NET_W      = 416, 416
OBJ_THRESH        = 0.50
NMS_THRESH        = 0.45
MAX_COS_DISTANCE  = 0.30
INFER_W, INFER_H  = 448, 448
FRAME_SKIP        = 3 
VIOLATION_COOLDOWN = 15
CAMERA_IDS        = ["CAM-1"]  # Only CAM-1 for PPE Detection
PPE_CONFIG_REFRESH = 30  # Refresh PPE config every 30 seconds

# Labels for Model 1 (V3)
V3_LABELS = {
    0: ("Helmet",              (0,   220,  0)),
    1: ("Person w/ Helmet",   (0,   255, 100)),
    2: ("Person w/o Helmet",  (0,    0, 255)),
}
V3_VIOLATION = 2

# Labels for Model 2 (V8)
V8_NAMES = {
    0: "helmet", 1: "gloves", 2: "vest", 3: "boots", 4: "goggles", 
    5: "none", 6: "Person", 7: "no_helmet", 8: "no_goggle", 
    9: "no_gloves", 10: "no_boots"
}
V8_VIOLATION_IDS = {7, 8, 9, 10}

# ─── Globals ──────────────────────────────────────────────────────────────────
_frame_lock   = threading.Lock()
_cached_jpegs = {cid: None for cid in CAMERA_IDS}
_model_v3     = None
_model_v8     = None
_encoder      = None
_anchors      = None
_last_alert: dict[str, float] = {}
_enabled_ppe_configs = []  # Dynamic PPE configurations from API
_last_config_fetch = 0

app = Flask(__name__)
CORS(app)

def _fetch_ppe_configs():
    """Fetch enabled PPE configurations from backend API."""
    global _enabled_ppe_configs, _last_config_fetch
    now = time.time()
    
    # Only refresh every PPE_CONFIG_REFRESH seconds
    if now - _last_config_fetch < PPE_CONFIG_REFRESH:
        return _enabled_ppe_configs
    
    try:
        response = requests.get(f"{API_BASE_URL}/ppe-config/enabled", timeout=3)
        if response.status_code == 200:
            configs = response.json().get('data', [])
            _enabled_ppe_configs = configs
            _last_config_fetch = now
            print(f"✅ Loaded {len(configs)} enabled PPE configurations")
            for cfg in configs:
                print(f"   - {cfg.get('icon', '🦺')} {cfg.get('displayName', 'Unknown')} (Class ID: {cfg.get('modelClassId', 'N/A')})")
            return configs
    except Exception as e:
        print(f"⚠️  Failed to fetch PPE configs: {e}")
    
    return _enabled_ppe_configs

def _is_ppe_enabled(model_class_id):
    """Check if a PPE item with given model class ID is enabled."""
    if not _enabled_ppe_configs:
        return False
    
    for cfg in _enabled_ppe_configs:
        if cfg.get('modelClassId') == model_class_id:
            return cfg.get('enabled', False)
    
    return False

def _send_violation(cam_id, track_id, frame, bbox, violation_type="No Helmet", confidence=0.85):
    """Async reporter for violations."""
    now = time.time()
    key = f"{cam_id}-{violation_type}-{track_id}"
    if now - _last_alert.get(key, 0) < VIOLATION_COOLDOWN:
        return
    _last_alert[key] = now

    def _post():
        try:
            x1, y1, x2, y2 = map(int, bbox)
            h, w = frame.shape[:2]
            crop = frame[max(0,y1):min(h,y2), max(0,x1):min(w,x2)]
            _, buf = cv2.imencode(".jpg", crop if crop.size > 0 else frame, [cv2.IMWRITE_JPEG_QUALITY, 55])
            snapshot = "data:image/jpeg;base64," + base64.b64encode(buf).decode()
            
            payload = {
                "cameraId": cam_id,
                "violationType": violation_type,
                "workerDescription": f"ID #{track_id}" if track_id else "Detected",
                "confidence": round(float(confidence), 3),
                "snapshot": snapshot
            }
            requests.post(f"{API_BASE_URL}/violations", json=payload, timeout=5)
        except: pass

    threading.Thread(target=_post, daemon=True).start()

def _generate_mjpeg(cam_id: str):
    """Yield MJPEG frames from cache."""
    last_sent = None
    while True:
        with _frame_lock:
            buf = _cached_jpegs.get(cam_id)
        if buf is None:
            time.sleep(0.05); continue
        if buf is last_sent:
            time.sleep(0.005); continue
        last_sent = buf
        yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + buf + b"\r\n")
        time.sleep(0.01)

@app.route("/video_feed/<cam_id>")
def video_feed(cam_id):
    if cam_id not in CAMERA_IDS: return jsonify({"error": "Unknown"}), 404
    return Response(_generate_mjpeg(cam_id), mimetype="multipart/x-mixed-replace; boundary=frame")

@app.route("/video_feed")
def video_feed_default(): return video_feed("CAM-1")

@app.route("/api/audio")
def generate_audio():
    text = request.args.get("text", "")
    lang = request.args.get("lang", "en-US")
    lang_code = lang.split("-")[0]
    
    if not text:
        return jsonify({"error": "No text"}), 400
        
    try:
        tts = gTTS(text=text, lang=lang_code)
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        return send_file(fp, mimetype="audio/mpeg")
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def run_flask():
    app.run(host="0.0.0.0", port=5001, threaded=True, use_reloader=False)

if __name__ == "__main__":
    if not os.path.exists(CONFIG_PATH) or not os.path.exists(WEIGHTS_V3):
        print("[ERROR] Missing core models."); sys.exit(1)

    with open(CONFIG_PATH) as f:
        _anchors = json.load(f)["model"]["anchors"]

    print("🚀 Loading SafeSight Dual-Model Engine (90FPS Mode)...")
    _model_v3 = load_model(WEIGHTS_V3, compile=False)
    _encoder  = gdet.create_box_encoder(DEEPSORT_PB, batch_size=1)
    
    if os.path.exists(WEIGHTS_V8):
        try:
            from ultralytics import YOLO
            _model_v8 = YOLO(WEIGHTS_V8)
            print("✅ Model 2 (YOLOv8) loaded.")
        except: print("⚠️ YOLOv8 load failed.")

    # Fetch initial PPE configurations
    print("\n📋 Fetching PPE configurations from backend...")
    _fetch_ppe_configs()

    threading.Thread(target=run_flask, daemon=True).start()

    # Try opening camera without backend first (more compatible)
    print(f"\n📹 Opening camera {CAMERA_INDEX}...")
    cap = cv2.VideoCapture(CAMERA_INDEX)
    if not cap.isOpened():
        print(f"   Retrying with DSHOW backend...")
        # Fallback to DSHOW on Windows
        cap = cv2.VideoCapture(CAMERA_INDEX, cv2.CAP_DSHOW if os.name=="nt" else cv2.CAP_ANY)
    
    if not cap.isOpened():
        print(f"❌ Failed to open camera {CAMERA_INDEX}")
        print(f"   Check your .env file: CAM_PPE_INDEX={CAMERA_INDEX}")
        sys.exit(1)
    
    print(f"✅ Camera {CAMERA_INDEX} opened successfully!")
    
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 360)
    cap.set(cv2.CAP_PROP_FPS, 90)
    
    metric = nn_matching.NearestNeighborDistanceMetric("cosine", MAX_COS_DISTANCE, None)
    tracker = Tracker(metric)
    frame_no = 0
    v3_boxes = []
    v8_boxes = []

    print("🎬 Monitoring Active at 90 FPS. Streams at http://localhost:5001")

    try:
        while True:
            ret, frame = cap.read()
            if not ret: time.sleep(0.001); continue
            
            frame_no += 1
            orig_h, orig_w = frame.shape[:2]

            if frame_no % FRAME_SKIP == 0:
                # Mode 1: Helmet
                infer_frame = cv2.resize(frame, (NET_W, NET_H))
                v3_boxes = get_yolo_boxes(_model_v3, [infer_frame], NET_H, NET_W, _anchors, OBJ_THRESH, NMS_THRESH)[0]
                sx, sy = orig_w/NET_W, orig_h/NET_H
                for b in v3_boxes:
                    b.xmin = int(b.xmin*sx); b.xmax = int(b.xmax*sx)
                    b.ymin = int(b.ymin*sy); b.ymax = int(b.ymax*sy)

                # Mode 2: Multi-PPE
                if _model_v8:
                    res_v8 = _model_v8(frame, conf=0.5, verbose=False)[0]
                    v8_boxes = []
                    for box in res_v8.boxes:
                        cls = int(box.cls[0])
                        cnf = float(box.conf[0])
                        xy = box.xyxy[0].cpu().numpy()
                        v8_boxes.append((xy, cls, cnf))

            # Tracking
            ds_boxes = [[b.xmin, b.ymin, b.xmax-b.xmin, b.ymax-b.ymin] for b in v3_boxes if (b.xmax-b.xmin)>0]
            ds_scores = [b.get_score() for b in v3_boxes if (b.xmax-b.xmin)>0]
            ds_labels = [b.label for b in v3_boxes if (b.xmax-b.xmin)>0]
            features = _encoder(frame, ds_boxes) if ds_boxes else []
            detections = [Detection(ds_boxes[i], ds_scores[i], features[i], ds_labels[i]) for i in range(len(ds_boxes))]
            tracker.predict()
            tracker.update(detections)

            # Refresh PPE configs periodically
            if frame_no % (FRAME_SKIP * 100) == 0:  # Every ~100 processed frames
                _fetch_ppe_configs()

            # Draw & Alert
            draw_frame = frame.copy()
            for track in tracker.tracks:
                if not track.is_confirmed() or track.time_since_update > 1: continue
                x1, y1, x2, y2 = map(int, track.to_tlbr())
                name, color = V3_LABELS.get(track.label, ("?", (128,128,128)))
                cv2.rectangle(draw_frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(draw_frame, f"#{track.track_id} {name}", (x1, y1-5), cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1)
                
                # Only send violation if helmet detection is enabled (modelClassId: 0)
                if track.label == V3_VIOLATION and _is_ppe_enabled(0):
                    _send_violation("CAM-1", track.track_id, frame, track.to_tlbr(), "No Helmet", track.score if hasattr(track,'score') else 0.8)

            for (xy, cls, cnf) in v8_boxes:
                if cls in V8_VIOLATION_IDS:
                    # Check if this PPE item is enabled before sending violation
                    # Map V8 violation class IDs to PPE config model class IDs
                    # 7: no_helmet (0), 8: no_goggle (4), 9: no_gloves (1), 10: no_boots (3)
                    ppe_class_map = {7: 0, 8: 4, 9: 1, 10: 3}
                    ppe_class_id = ppe_class_map.get(cls)
                    
                    if ppe_class_id is not None and _is_ppe_enabled(ppe_class_id):
                        x1, y1, x2, y2 = map(int, xy)
                        name = V8_NAMES.get(cls, "Violation")
                        cv2.rectangle(draw_frame, (x1, y1), (x2, y2), (0,0,255), 2)
                        cv2.putText(draw_frame, name, (x1, y2+15), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0,0,255), 1)
                        _send_violation("CAM-1", None, frame, xy, name, cnf)

            # Encode for streams
            ok, mj = cv2.imencode(".jpg", draw_frame, [cv2.IMWRITE_JPEG_QUALITY, 35])
            if ok:
                buf = mj.tobytes()
                with _frame_lock:
                    for cid in CAMERA_IDS: _cached_jpegs[cid] = buf

    except KeyboardInterrupt: pass
    finally: cap.release()
