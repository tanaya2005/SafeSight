import cv2
import numpy as np
from ultralytics import YOLO
from huggingface_hub import hf_hub_download
import time
import os
from dotenv import load_dotenv
import warnings

# Load environment variables
load_dotenv()
warnings.filterwarnings('ignore')

# 1. SETUP: Download and Load the model from Hugging Face
print("📦 Downloading Construction Hazard Detection model...")
try:
    # Using the yolo11s (small) version for the latest construction safety detections
    model_path = hf_hub_download(repo_id="yihong1120/Construction-Hazard-Detection", filename="models/yolo11/pt/yolo11s.pt")
    model = YOLO(model_path)
except Exception as e:
    print(f"❌ Failed to load HF model: {e}. Falling back to local default.")
    model = YOLO("yolov8n.pt")

# Class mapping based on repo's class_names.txt
# Classes are: Hardhat, Mask, NO-Hardhat, NO-Mask, NO-Safety Vest, Person, Safety Cone, Safety Vest, Machinery, Utility Pole, Vehicle
# Map these to internal logic labels
CLASS_MAP = {
    'person': 'Person',     # Class 5
    'cone': 'Safety Cone',  # Class 6
    'helmet': 'Hardhat',    # Class 0
    'no_helmet': 'NO-Hardhat' # Class 2
}

# 2. ZONE DEFINITIONS WITH SEVERITY LEVELS
# Format: dictionary with polygon, color, name, and severity
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
        "name": "Low Danger Zone",
        "severity": "warning"
    }
]

user_points = []
def mouse_callback(event, x, y, flags, param):
    """Capture mouse clicks to define a custom restricted zone."""
    global user_points
    if event == cv2.EVENT_LBUTTONDOWN:
        user_points.append([x, y])
        print(f"📍 Point added: ({x}, {y})")
    elif event == cv2.EVENT_RBUTTONDOWN:
        user_points = []
        print("🧹 Custom zone cleared.")

# 2. ZONE DETECTION FUNCTIONS
BUFFER_PX = 40  # Approximation of "2 meters" in pixels for cone proximity

def check_intrusion(bbox, zone_polygon):
    """Verify if ANY part of the person's boundary (4 corners) is inside a specific zone polygon."""
    x1, y1, x2, y2 = bbox
    # Points to check: 4 corners of the bounding box
    points = [
        (float(x1), float(y1)), # Top-left
        (float(x2), float(y1)), # Top-right
        (float(x1), float(y2)), # Bottom-left
        (float(x2), float(y2)), # Bottom-right
        (float((x1+x2)/2), float(y2)) # Feet center
    ]
    
    for pt in points:
        if cv2.pointPolygonTest(zone_polygon, pt, False) >= 0:
            return True
    return False

def get_cone_zones(detections):
    """Generate dynamic exclusion zones around detected safety cones."""
    zones = []
    for det in detections:
        if det['class'] == CLASS_MAP['cone']:
            x1, y1, x2, y2 = det['bbox']
            # Create a diamond/square zone around the cone base
            cx, cy = (x1 + x2) / 2, y2
            poly = np.array([
                [cx - BUFFER_PX, cy],
                [cx, cy - BUFFER_PX],
                [cx + BUFFER_PX, cy],
                [cx, cy + BUFFER_PX]
            ], np.int32)
            zones.append(poly)
    return zones

def main():
    global user_points
    cam_index = int(os.getenv('CAM_WEBCAM_INDEX', 0))  # Use env variable or default to 0
    cap = cv2.VideoCapture(cam_index)
    if not cap.isOpened():
        print(f"Error: webcam {cam_index} not found")
        return

    cv2.namedWindow("Advanced Site Inspector")
    cv2.setMouseCallback("Advanced Site Inspector", mouse_callback)

    print("--- Safe-Sight Dynamic Inspector Active ---")
    print("🖱️  LEFT-CLICK to define points of a Restricted Zone.")
    print("🖱️  RIGHT-CLICK to clear the custom zone.")
    print("Press 'q' to exit.")

    while True:
        ret, frame = cap.read()
        if not ret: break
        
        # Resize for consistent logic (640x480)
        frame = cv2.resize(frame, (640, 480))
        results = model.predict(frame, conf=0.3, verbose=False)
        
        detections = []
        for result in results:
            for box in result.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                cls_id = int(box.cls[0])
                cls_name = model.names[cls_id]
                conf = float(box.conf[0])
                detections.append({'bbox': (x1, y1, x2, y2), 'class': cls_name, 'conf': conf})

        # Define the complete Restricted Zone for this frame
        # Combines dynamic cone zones and User-defined zones
        cone_zones = get_cone_zones(detections)
        user_zone = [np.array(user_points, np.int32)] if len(user_points) >= 3 else []
        
        # Visuals: Draw active restricted areas with different colors
        overlay = frame.copy()
        
        # Draw predefined zones
        for zone_def in ZONE_DEFINITIONS:
            cv2.fillPoly(overlay, [zone_def["polygon"]], zone_def["color"])
            cv2.polylines(frame, [zone_def["polygon"]], True, zone_def["color"], 2)
            # Add zone label
            M = cv2.moments(zone_def["polygon"])
            if M["m00"] != 0:
                cx = int(M["m10"] / M["m00"])
                cy = int(M["m01"] / M["m00"])
                cv2.putText(frame, zone_def["name"], (cx - 60, cy), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
        
        # Draw cone zones
        for zone in cone_zones:
            cv2.fillPoly(overlay, [zone], (0, 255, 255))  # Yellow for cone zones
        
        # Draw user-defined zone
        for zone in user_zone:
            cv2.fillPoly(overlay, [zone], (255, 0, 255))  # Magenta for user zones
        
        cv2.addWeighted(overlay, 0.2, frame, 0.8, 0, frame)
        
        # Draw current points if polygon is incomplete
        for pt in user_points:
            cv2.circle(frame, tuple(pt), 4, (0, 0, 255), -1)

        # Process Workers
        for i, det in enumerate(detections):
            if det['class'] == CLASS_MAP['person']:
                x1, y1, x2, y2 = det['bbox']
                feet_coords = (int((x1 + x2) / 2), y2)
                
                # Check intrusion for each predefined zone
                intruding_zones = []
                for zone_def in ZONE_DEFINITIONS:
                    if check_intrusion(det['bbox'], zone_def["polygon"]):
                        intruding_zones.append(zone_def)
                
                # Also check cone zones and user zones
                in_cone_zone = any(check_intrusion(det['bbox'], z) for z in cone_zones)
                in_user_zone = any(check_intrusion(det['bbox'], z) for z in user_zone)
                
                in_zone = len(intruding_zones) > 0 or in_cone_zone or in_user_zone
                zone_status = "In Restricted Zone" if in_zone else "Safe Area"
                
                # Violation 2: Check for NO-Hardhat class near person or specific Hardhat presence
                # The model often detects 'NO-Hardhat' specifically.
                has_no_hardhat = False
                for h_det in detections:
                    if h_det['class'] == CLASS_MAP['no_helmet']:
                        hx1, hy1, hx2, hy2 = h_det['bbox']
                        # Check if NO-Hardhat is within worker's horizontal bounds
                        if hx1 >= x1-10 and hx2 <= x2+10 and hy1 < y1 + (y2-y1)*0.5:
                            has_no_hardhat = True
                            break
                
                violation_type = "None"
                if in_zone and has_no_hardhat:
                    violation_type = "PPE Violation: No Hard Hat in Hazard Zone"
                elif in_zone:
                    if intruding_zones:
                        zone_names = ", ".join([z["name"] for z in intruding_zones])
                        violation_type = f"{zone_names} Intrusion"
                    else:
                        violation_type = "Restricted Zone Intrusion"

                # Structured Output Logic as requested
                if in_zone:
                    worker_id = f"WRK_{i:03d}"
                    print(f"[{worker_id}, {zone_status}, {violation_type}, {det['conf']:.2f}]")

                # UI Rendering - use most severe zone color
                if intruding_zones:
                    most_severe = intruding_zones[0]
                    for z in intruding_zones:
                        if z["severity"] == "critical":
                            most_severe = z
                            break
                    color = most_severe["color"]
                else:
                    color = (0, 0, 255) if in_zone else (0, 255, 0)
                
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                cv2.circle(frame, feet_coords, 5, color, -1)
                
                if violation_type != "None":
                    cv2.putText(frame, "!!! VIOLATION !!!", (x1, y1 - 10), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
        
        # Add Zone Legend
        legend_y = 80
        cv2.putText(frame, "Zone Legend:", (10, legend_y), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        for zone_def in ZONE_DEFINITIONS:
            legend_y += 25
            # Draw color box
            cv2.rectangle(frame, (10, legend_y - 15), (30, legend_y - 5), zone_def["color"], -1)
            # Draw zone name and severity
            text = f"{zone_def['name']} ({zone_def['severity'].upper()})"
            cv2.putText(frame, text, (35, legend_y - 5), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)

        cv2.imshow("Advanced Site Inspector", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
