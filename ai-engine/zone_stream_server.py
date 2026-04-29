"""
SafeSight - Zone Intrusion Detection Stream Server
===================================================
Monitors restricted zones and detects unauthorized access.
Streams to CAM-2 on the dashboard.

Based on Archit's advanced_safety_inspector.py
"""

import os
import sys
import cv2
import numpy as np
import requests
import base64
import time
import threading
from flask import Flask, Response
from flask_cors import CORS
from ultralytics import YOLO
from dotenv import load_dotenv
import warnings

# Load environment variables
load_dotenv()
warnings.filterwarnings('ignore')

# ─── Configuration ────────────────────────────────────────────────────────────
API_BASE_URL = "http://localhost:5000/api"
CAMERA_INDEX = int(os.getenv('CAM_ZONE_INDEX', 3))  # Use env variable or default to 3
CAMERA_IDS = ["CAM-2"]  # Only CAM-2 for Zone monitoring
VIOLATION_COOLDOWN = 18

# Zone definitions with severity levels
# Format: (polygon, color_bgr, zone_name, severity)
ZONE_DEFINITIONS = [
    {
        "polygon": np.array([[450, 350], [620, 320], [630, 460], [420, 470]], np.int32),
        "color": (0, 0, 255),  # Red (BGR)
        "name": "High Danger Zone",
        "severity": "critical"
    },
    {
        "polygon": np.array([[50, 100], [200, 100], [200, 250], [50, 250]], np.int32),
        "color": (0, 165, 255),  # Orange (BGR)
        "name": "Gas Leak Zone",
        "severity": "warning"
    }
]

# ─── Globals ──────────────────────────────────────────────────────────────────
_frame_lock = threading.Lock()
_cached_jpegs = {cid: None for cid in CAMERA_IDS}
_model = None
_last_alert = {}
_user_zones = []  # Custom zones defined by user

app = Flask(__name__)
CORS(app)

def check_intrusion(bbox, zone_polygon):
    """Check if person's bounding box intersects with a specific zone polygon."""
    x1, y1, x2, y2 = bbox
    points = [
        (float(x1), float(y1)),  # Top-left
        (float(x2), float(y1)),  # Top-right
        (float(x1), float(y2)),  # Bottom-left
        (float(x2), float(y2)),  # Bottom-right
        (float((x1+x2)/2), float(y2))  # Feet center
    ]
    
    for pt in points:
        if cv2.pointPolygonTest(zone_polygon, pt, False) >= 0:
            return True
    return False

def send_zone_violation(cam_id, bbox, frame, worker_id, zone_name, severity):
    """Send zone intrusion alert to backend."""
    # Cooldown is handled per-worker by the caller now

    def _post():
        try:
            x1, y1, x2, y2 = map(int, bbox)
            h, w = frame.shape[:2]
            crop = frame[max(0,y1):min(h,y2), max(0,x1):min(w,x2)]
            _, buf = cv2.imencode(".jpg", crop if crop.size > 0 else frame, [cv2.IMWRITE_JPEG_QUALITY, 55])
            snapshot = "data:image/jpeg;base64," + base64.b64encode(buf).decode()
            
            violation_type = f"{zone_name} Entry"
            
            payload = {
                "cameraId": cam_id,
                "violationType": violation_type,
                "workerDescription": f"Zone: {zone_name} - Severity: {severity.upper()} - trackingID: {worker_id}",
                "confidence": 0.95,
                "snapshot": snapshot
            }
            requests.post(f"{API_BASE_URL}/violations", json=payload, timeout=5)
            print(f"⚠️  {severity.upper()} - {zone_name} intrusion detected on {cam_id} (Worker #{worker_id})")
        except Exception as e:
            print(f"Failed to send zone violation: {e}")
    
    threading.Thread(target=_post, daemon=True).start()

def _generate_mjpeg(cam_id):
    """Yield MJPEG frames from cache."""
    last_sent = None
    while True:
        with _frame_lock:
            buf = _cached_jpegs.get(cam_id)
        if buf is None:
            time.sleep(0.05)
            continue
        if buf is last_sent:
            time.sleep(0.005)
            continue
        last_sent = buf
        yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + buf + b"\r\n")
        time.sleep(0.01)

@app.route("/video_feed/<cam_id>")
def video_feed(cam_id):
    if cam_id not in CAMERA_IDS:
        return {"error": "Unknown camera"}, 404
    return Response(_generate_mjpeg(cam_id), mimetype="multipart/x-mixed-replace; boundary=frame")

def run_flask():
    app.run(host="0.0.0.0", port=5002, threaded=True, use_reloader=False)

if __name__ == "__main__":
    print("🚀 Loading SafeSight Zone Intrusion Detection System...")
    
    # Load YOLO model
    try:
        _model = YOLO("yolov8n.pt")
        print("✅ YOLOv8 model loaded")
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        sys.exit(1)
    
    # Start Flask server
    threading.Thread(target=run_flask, daemon=True).start()
    
    # Open camera - try without backend first (more compatible)
    cap = cv2.VideoCapture(CAMERA_INDEX)
    if not cap.isOpened():
        # Fallback to DSHOW on Windows
        cap = cv2.VideoCapture(CAMERA_INDEX, cv2.CAP_DSHOW if os.name == "nt" else cv2.CAP_ANY)
    
    if not cap.isOpened():
        print(f"❌ Could not open camera {CAMERA_INDEX}")
        sys.exit(1)
    
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    
    print(f"🎬 Zone Monitoring Active. Streams at http://localhost:5002")
    print(f"📹 Monitoring cameras: {', '.join(CAMERA_IDS)}")
    
    frame_no = 0
    zone_occupants = {}  # Format: {track_id: {zone_name: last_alert_time}}
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                time.sleep(0.001)
                continue
            
            frame_no += 1
            draw_frame = frame.copy()
            
            # Draw restricted zones with different colors
            for zone_def in ZONE_DEFINITIONS:
                zone_poly = zone_def["polygon"]
                zone_color = zone_def["color"]
                zone_name = zone_def["name"]
                
                # Draw zone outline
                cv2.polylines(draw_frame, [zone_poly], True, zone_color, 2)
                
                # Add semi-transparent fill
                overlay = draw_frame.copy()
                cv2.fillPoly(overlay, [zone_poly], zone_color)
                cv2.addWeighted(overlay, 0.3, draw_frame, 0.7, 0, draw_frame)
                
                # Add zone label
                M = cv2.moments(zone_poly)
                if M["m00"] != 0:
                    cx = int(M["m10"] / M["m00"])
                    cy = int(M["m01"] / M["m00"])
                    cv2.putText(draw_frame, zone_name, (cx - 50, cy), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
            
            # Run tracking every 3 frames
            if frame_no % 3 == 0:
                results = _model.track(frame, persist=True, conf=0.5, verbose=False)
                current_intruders = {}  # {track_id: [zone_names]}
                
                for result in results:
                    if result.boxes and result.boxes.id is not None:
                        boxes = result.boxes.xyxy.cpu().numpy()
                        track_ids = result.boxes.id.int().cpu().tolist()
                        cls_ids = result.boxes.cls.int().cpu().tolist()
                        
                        for box, track_id, cls_id in zip(boxes, track_ids, cls_ids):
                            class_name = _model.names[cls_id].lower()
                            
                            # Only check for persons
                            if class_name == 'person':
                                x1, y1, x2, y2 = map(int, box)
                                
                                # Check intrusion for each zone
                                intruding_zones = []
                                for zone_def in ZONE_DEFINITIONS:
                                    if check_intrusion(box, zone_def["polygon"]):
                                        intruding_zones.append(zone_def)
                                
                                if intruding_zones:
                                    current_intruders[track_id] = intruding_zones
                                    
                                    # Draw red box for intruder with zone info
                                    # Use the most severe zone color
                                    most_severe = intruding_zones[0]
                                    for z in intruding_zones:
                                        if z["severity"] == "critical":
                                            most_severe = z
                                            break
                                    
                                    cv2.rectangle(draw_frame, (x1, y1), (x2, y2), most_severe["color"], 3)
                                    
                                    # Display all intruding zones
                                    zone_names = ", ".join([z["name"] for z in intruding_zones])
                                    cv2.putText(draw_frame, f"INTRUDER! ID:{track_id}", (x1, y1-25), 
                                              cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
                                    cv2.putText(draw_frame, zone_names, (x1, y1-10), 
                                              cv2.FONT_HERSHEY_SIMPLEX, 0.4, most_severe["color"], 1)
                                    
                                    # UNIQUE ENTRY TRACKING WITH COOLDOWN PER ZONE
                                    now = time.time()
                                    if track_id not in zone_occupants:
                                        zone_occupants[track_id] = {}
                                    
                                    for zone_def in intruding_zones:
                                        zone_name = zone_def["name"]
                                        if zone_name not in zone_occupants[track_id]:
                                            # First entry into this zone
                                            zone_occupants[track_id][zone_name] = now
                                            send_zone_violation("CAM-2", box, frame, f"{track_id}", 
                                                              zone_name, zone_def["severity"])
                                        else:
                                            # Check cooldown
                                            if now - zone_occupants[track_id][zone_name] > VIOLATION_COOLDOWN:
                                                zone_occupants[track_id][zone_name] = now
                                                send_zone_violation("CAM-2", box, frame, f"{track_id}", 
                                                                  zone_name, zone_def["severity"])
                                else:
                                    # Draw green box for safe
                                    cv2.rectangle(draw_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                                    cv2.putText(draw_frame, f"Safe {track_id}", (x1, y1-10), 
                                              cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

                # Clean up workers who left all restricted zones
                for tid in list(zone_occupants.keys()):
                    if tid not in current_intruders:
                        del zone_occupants[tid]
                    else:
                        # Remove zones they're no longer in
                        current_zone_names = [z["name"] for z in current_intruders[tid]]
                        for zone_name in list(zone_occupants[tid].keys()):
                            if zone_name not in current_zone_names:
                                del zone_occupants[tid][zone_name]
            
            # Add HUD with zone legend
            cv2.putText(draw_frame, "Zone Intrusion Detection", (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            cv2.putText(draw_frame, f"Active Zones: {len(ZONE_DEFINITIONS)}", (10, 60), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            # Zone Legend
            legend_y = 90
            cv2.putText(draw_frame, "Zone Legend:", (10, legend_y), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            for i, zone_def in enumerate(ZONE_DEFINITIONS):
                legend_y += 25
                # Draw color box
                cv2.rectangle(draw_frame, (10, legend_y - 15), (30, legend_y - 5), zone_def["color"], -1)
                # Draw zone name and severity
                text = f"{zone_def['name']} ({zone_def['severity'].upper()})"
                cv2.putText(draw_frame, text, (35, legend_y - 5), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
            
            # Encode for streams
            ok, mj = cv2.imencode(".jpg", draw_frame, [cv2.IMWRITE_JPEG_QUALITY, 40])
            if ok:
                buf = mj.tobytes()
                with _frame_lock:
                    for cid in CAMERA_IDS:
                        _cached_jpegs[cid] = buf
    
    except KeyboardInterrupt:
        print("\n👋 Shutting down zone monitoring...")
    finally:
        cap.release()
