"""
SafeSight – PPE Detection Engine
================================
Real-time PPE compliance detection using YOLOv8 and OpenCV.

Usage:
    python detect_ppe_webcam.py

Requirements:
    pip install -r requirements.txt

Default credentials for backend API:
    POST http://localhost:5000/api/auth/login
    { "username": "supervisor", "password": "safesight123" }
"""

import cv2
import requests
import json
import time
import sys
import os
from datetime import datetime
from ultralytics import YOLO
from dotenv import load_dotenv
import warnings

# Load environment variables
load_dotenv()
warnings.filterwarnings('ignore')

# ─── Configuration ─────────────────────────────────────────────────────────────
CAMERA_ID = "CAM-1"           # Identifier sent to backend
CAMERA_INDEX = int(os.getenv('CAM_WEBCAM_INDEX', 0))  # Use env variable or default to 0
API_BASE_URL = "http://localhost:5000/api"
VIOLATION_COOLDOWN = 5        # Seconds between repeated violation alerts (same type)
CONFIDENCE_THRESHOLD = 0.45   # Minimum confidence for detection
FRAME_SKIP = 2                # Process every Nth frame (reduces CPU usage)

# ─── PPE Class Mapping ─────────────────────────────────────────────────────────
# Map YOLOv8 detected class names to PPE categories
# Adjust these based on your actual trained model's class names
PPE_CLASSES = {
    # Helmet detection
    "helmet":           {"label": "Helmet", "color": (0, 255, 0),    "required": True},
    "hard hat":         {"label": "Helmet", "color": (0, 255, 0),    "required": True},
    "hardhat":          {"label": "Helmet", "color": (0, 255, 0),    "required": True},
    "no-helmet":        {"label": "No Helmet ⚠", "color": (0, 0, 255), "violation": True},
    "no helmet":        {"label": "No Helmet ⚠", "color": (0, 0, 255), "violation": True},

    # Vest detection
    "vest":             {"label": "Safety Vest", "color": (0, 200, 100), "required": True},
    "safety vest":      {"label": "Safety Vest", "color": (0, 200, 100), "required": True},
    "no-vest":          {"label": "No Vest ⚠", "color": (0, 80, 200),    "violation": True},
    "no vest":          {"label": "No Vest ⚠", "color": (0, 80, 200),    "violation": True},

    # Goggles detection
    "goggles":          {"label": "Goggles", "color": (255, 150, 0),   "required": True},
    "safety goggles":   {"label": "Goggles", "color": (255, 150, 0),   "required": True},
    "no-goggles":       {"label": "No Goggles ⚠", "color": (0, 50, 255), "violation": True},

    # Boots detection
    "boots":            {"label": "Safety Boots", "color": (200, 100, 0), "required": True},
    "safety boots":     {"label": "Safety Boots", "color": (200, 100, 0), "required": True},

    # General person (used for tracking without PPE)
    "person":           {"label": "Person", "color": (180, 180, 180), "required": False},
}

VIOLATION_TYPES = {"no-helmet", "no helmet", "no-vest", "no vest", "no-goggles"}


def send_violation_alert(violation_type: str, confidence: float):
    """
    Send a PPE violation alert to the SafeSight backend.
    The backend will broadcast it to the React dashboard via Socket.IO.
    """
    try:
        payload = {
            "cameraId": CAMERA_ID,
            "violationType": violation_type,
            "confidence": round(confidence, 3),
            "workerDescription": "Worker detected without PPE",
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
        response = requests.post(
            f"{API_BASE_URL}/violations",
            json=payload,
            timeout=2,
        )
        if response.status_code == 200:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] ⚠  Violation sent: {violation_type} (conf: {confidence:.2f})")
        else:
            print(f"[WARN] Backend returned {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("[WARN] Cannot reach backend. Is the server running on port 5000?")
    except Exception as e:
        print(f"[ERROR] Failed to send violation: {e}")


def draw_detection(frame, box, label: str, confidence: float, color: tuple):
    """Draw bounding box and label on frame."""
    x1, y1, x2, y2 = map(int, box.xyxy[0])

    # Draw bounding box
    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

    # Label background
    label_text = f"{label} {confidence:.0%}"
    (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)
    cv2.rectangle(frame, (x1, y1 - th - 8), (x1 + tw + 8, y1), color, -1)

    # Label text
    cv2.putText(
        frame, label_text,
        (x1 + 4, y1 - 4),
        cv2.FONT_HERSHEY_SIMPLEX, 0.55,
        (255, 255, 255), 1, cv2.LINE_AA
    )


def draw_overlay(frame, frame_count: int, detection_count: int, violation_count: int):
    """Draw HUD overlay on the frame."""
    h, w = frame.shape[:2]

    # Top bar background
    cv2.rectangle(frame, (0, 0), (w, 50), (20, 20, 30), -1)

    # SafeSight title
    cv2.putText(frame, "SafeSight AI | PPE Detection",
                (10, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (100, 200, 255), 2, cv2.LINE_AA)

    # Camera ID + timestamp
    ts = datetime.now().strftime("%H:%M:%S")
    cv2.putText(frame, f"{CAMERA_ID} | {ts}",
                (w - 200, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (180, 180, 180), 1, cv2.LINE_AA)

    # Bottom bar
    cv2.rectangle(frame, (0, h - 40), (w, h), (20, 20, 30), -1)
    cv2.putText(frame, f"Frame: {frame_count}  |  Detections: {detection_count}  |  Violations: {violation_count}",
                (10, h - 14), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (160, 160, 160), 1, cv2.LINE_AA)

    # Live indicator
    cv2.circle(frame, (w - 25, h - 20), 7, (0, 0, 220), -1)
    cv2.putText(frame, "LIVE", (w - 55, h - 14), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 220), 1, cv2.LINE_AA)


def main():
    print("=" * 60)
    print("  SafeSight – PPE Detection Engine")
    print("=" * 60)
    print(f"  Camera : {CAMERA_ID} (index {CAMERA_INDEX})")
    print(f"  Backend: {API_BASE_URL}")
    print(f"  YOLO   : YOLOv8n (auto-download on first run)")
    print(f"  Press Q to quit")
    print("=" * 60)

    # Load YOLO model
    # Using yolov8n.pt (nano) for speed; replace with your fine-tuned PPE model
    print("\n📦 Loading YOLOv8 model...")
    try:
        model = YOLO("yolov8n.pt")   # Auto-downloads ~6MB on first run
        print("✅ Model loaded successfully\n")
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        sys.exit(1)

    # Open webcam
    print(f"📷 Opening camera {CAMERA_INDEX}...")
    cap = cv2.VideoCapture(CAMERA_INDEX)

    if not cap.isOpened():
        print(f"❌ Could not open camera {CAMERA_INDEX}. Try changing CAMERA_INDEX.")
        sys.exit(1)

    # Set resolution
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    print("✅ Camera opened. Starting detection loop...\n")

    frame_count = 0
    total_violations = 0
    last_violation_time = {}   # Track cooldowns per violation type

    while True:
        ret, frame = cap.read()
        if not ret:
            print("⚠  Camera read failed. Retrying...")
            time.sleep(0.5)
            continue

        frame_count += 1

        # Skip frames to reduce CPU usage
        if frame_count % FRAME_SKIP != 0:
            cv2.imshow("SafeSight – PPE Detection | Press Q to quit", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
            continue

        # Run YOLO inference
        results = model(frame, conf=CONFIDENCE_THRESHOLD, verbose=False)

        detection_count = 0
        current_violations = []

        for result in results:
            for box in result.boxes:
                class_id = int(box.cls[0])
                class_name = model.names[class_id].lower()
                confidence = float(box.conf[0])

                if confidence < CONFIDENCE_THRESHOLD:
                    continue

                detection_count += 1
                ppe_info = PPE_CLASSES.get(class_name)

                if ppe_info:
                    color = ppe_info["color"]
                    label = ppe_info["label"]
                    is_violation = ppe_info.get("violation", False)
                else:
                    # Unknown class – draw in gray
                    color = (100, 100, 100)
                    label = class_name
                    is_violation = False

                draw_detection(frame, box, label, confidence, color)

                # Check for violation with cooldown
                if is_violation or class_name in VIOLATION_TYPES:
                    now = time.time()
                    last = last_violation_time.get(class_name, 0)
                    if now - last > VIOLATION_COOLDOWN:
                        current_violations.append((class_name, confidence))
                        last_violation_time[class_name] = now

        # Send violation alerts
        for v_type, v_conf in current_violations:
            total_violations += 1
            send_violation_alert(v_type, v_conf)

        # Draw HUD
        draw_overlay(frame, frame_count, detection_count, total_violations)

        # Display
        cv2.imshow("SafeSight – PPE Detection | Press Q to quit", frame)

        # Quit on Q
        if cv2.waitKey(1) & 0xFF == ord('q'):
            print("\n👋 Quit requested. Shutting down...")
            break

    cap.release()
    cv2.destroyAllWindows()
    print("✅ SafeSight detection engine stopped.")


if __name__ == "__main__":
    main()
