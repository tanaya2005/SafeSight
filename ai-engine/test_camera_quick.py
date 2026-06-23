"""
Quick Camera Test - Check if any camera is available
"""
import cv2
import sys

print("Testing camera access...")
print("-" * 50)

# Test camera indices 0-3
for i in range(4):
    print(f"\nTesting camera index {i}...")
    cap = cv2.VideoCapture(i)
    
    if cap.isOpened():
        ret, frame = cap.read()
        if ret:
            print(f"✅ Camera {i} is WORKING!")
            print(f"   Resolution: {frame.shape[1]}x{frame.shape[0]}")
            cap.release()
        else:
            print(f"⚠️  Camera {i} opened but cannot read frames")
            cap.release()
    else:
        print(f"❌ Camera {i} not available")

print("\n" + "-" * 50)
print("Test complete. Press Enter to exit...")
