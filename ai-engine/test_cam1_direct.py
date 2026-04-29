"""Quick test to open camera 1 directly"""
import cv2
import os
from dotenv import load_dotenv

load_dotenv()

cam_index = int(os.getenv('CAM_PPE_INDEX', 1))
print(f"Attempting to open camera {cam_index}...")

cap = cv2.VideoCapture(cam_index, cv2.CAP_DSHOW if os.name == "nt" else cv2.CAP_ANY)

if not cap.isOpened():
    print(f"❌ Failed to open camera {cam_index}")
    print("\nTrying without backend...")
    cap = cv2.VideoCapture(cam_index)
    
if cap.isOpened():
    print(f"✅ Camera {cam_index} opened successfully!")
    ret, frame = cap.read()
    if ret:
        print(f"✅ Frame captured: {frame.shape}")
        cv2.imwrite("test_frame_cam1.jpg", frame)
        print("✅ Saved test_frame_cam1.jpg")
    else:
        print("❌ Failed to read frame")
    cap.release()
else:
    print(f"❌ Could not open camera {cam_index}")
    print("\nAvailable cameras:")
    for i in range(5):
        test_cap = cv2.VideoCapture(i)
        if test_cap.isOpened():
            print(f"  ✓ Camera {i}")
            test_cap.release()
