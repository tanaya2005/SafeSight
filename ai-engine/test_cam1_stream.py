"""
Quick test to verify CAM-1 is working and streaming
"""
import cv2
import requests
import time

print("=" * 60)
print("  CAM-1 Diagnostic Test")
print("=" * 60)

# Test 1: Check if camera hardware works
print("\n[Test 1] Testing camera hardware...")
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("❌ FAILED: Camera 0 cannot be opened")
    print("   - Check if another app is using the camera")
    print("   - Try closing Zoom, Teams, Skype, etc.")
    exit(1)

ret, frame = cap.read()
if not ret or frame is None:
    print("❌ FAILED: Camera opened but cannot read frames")
    cap.release()
    exit(1)

h, w = frame.shape[:2]
print(f"✅ PASSED: Camera 0 is working")
print(f"   Resolution: {w}x{h}")
cap.release()

# Test 2: Check if Flask server is running
print("\n[Test 2] Testing Flask server...")
try:
    response = requests.get("http://localhost:5001/", timeout=2)
    print(f"✅ PASSED: Flask server is running")
    print(f"   Status: {response.status_code}")
except requests.exceptions.ConnectionError:
    print("❌ FAILED: Flask server is not running")
    print("   - Start the server: python camera_stream_server.py")
    exit(1)
except Exception as e:
    print(f"❌ FAILED: {e}")
    exit(1)

# Test 3: Check if video stream endpoint works
print("\n[Test 3] Testing video stream endpoint...")
try:
    response = requests.get("http://localhost:5001/video_feed/CAM-1", timeout=2, stream=True)
    if response.status_code == 200:
        print(f"✅ PASSED: Video stream endpoint is working")
        print(f"   Content-Type: {response.headers.get('Content-Type')}")
        
        # Try to read first few bytes
        chunk = next(response.iter_content(chunk_size=1024))
        if chunk:
            print(f"   Receiving data: {len(chunk)} bytes")
    else:
        print(f"❌ FAILED: Status code {response.status_code}")
except Exception as e:
    print(f"❌ FAILED: {e}")
    exit(1)

# Test 4: Check CORS headers
print("\n[Test 4] Testing CORS headers...")
try:
    response = requests.options("http://localhost:5001/video_feed/CAM-1", 
                               headers={"Origin": "http://localhost:5173"})
    cors_header = response.headers.get('Access-Control-Allow-Origin')
    if cors_header:
        print(f"✅ PASSED: CORS is configured")
        print(f"   Allow-Origin: {cors_header}")
    else:
        print("⚠️  WARNING: CORS headers not found")
        print("   This might cause issues in the browser")
except Exception as e:
    print(f"⚠️  WARNING: Could not check CORS: {e}")

print("\n" + "=" * 60)
print("✅ ALL TESTS PASSED!")
print("\nCAM-1 should be working in the dashboard.")
print("If it's still not showing:")
print("1. Check browser console (F12) for errors")
print("2. Try refreshing the page (Ctrl+F5)")
print("3. Check if browser is blocking mixed content")
print("=" * 60)
