"""
Test script to detect all available cameras on your system
"""
import cv2

print("=" * 60)
print("  SafeSight - Camera Detection Test")
print("=" * 60)
print("\nScanning for available cameras...\n")

available_cameras = []

for i in range(5):
    cap = cv2.VideoCapture(i)
    if cap.isOpened():
        ret, frame = cap.read()
        if ret and frame is not None:
            h, w = frame.shape[:2]
            print(f"✓ Camera {i}: Available")
            print(f"  Resolution: {w}x{h}")
            print(f"  Use in code: CAMERA_INDEX = {i}")
            available_cameras.append(i)
        cap.release()
    else:
        print(f"✗ Camera {i}: Not available")
    print()

print("=" * 60)
print(f"\nTotal cameras found: {len(available_cameras)}")

if len(available_cameras) == 0:
    print("\n⚠️  No cameras detected!")
    print("   - Check if webcam is connected")
    print("   - Check if another app is using the camera")
elif len(available_cameras) == 1:
    print(f"\n✓ 1 camera available (index {available_cameras[0]})")
    print("   Both CAM-1 and CAM-2 will use the same camera")
    print("   This is fine for demo purposes!")
elif len(available_cameras) >= 2:
    print(f"\n✓ {len(available_cameras)} cameras available!")
    print(f"   CAM-1 (PPE): Use camera {available_cameras[0]}")
    print(f"   CAM-2 (Zone): Use camera {available_cameras[1]}")
    print("\n   Update zone_stream_server.py:")
    print(f"   CAMERA_INDEX = {available_cameras[1]}")

print("\n" + "=" * 60)
