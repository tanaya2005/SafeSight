# Camera Setup Guide - SafeSight

## Current Setup (1 Webcam)
Both CAM-1 and CAM-2 use the same physical webcam (index 0):
- **CAM-1** (Port 5001): PPE Detection - `camera_stream_server.py`
- **CAM-2** (Port 5002): Zone Monitoring - `zone_stream_server.py`

Both servers are already running simultaneously on your laptop!

---

## Option 1: Two Webcams on Same Laptop ✅ RECOMMENDED

### Requirements:
- 1 built-in webcam (index 0)
- 1 external USB webcam (index 1)

### Setup Steps:

1. **Connect external USB webcam** to your laptop

2. **Test camera indices:**
```bash
cd ai-engine
python -c "import cv2; print('Camera 0:', cv2.VideoCapture(0).isOpened()); print('Camera 1:', cv2.VideoCapture(1).isOpened())"
```

3. **Update zone_stream_server.py** to use camera 1:
```python
# Line 25 in ai-engine/zone_stream_server.py
CAMERA_INDEX = 1  # Use external USB webcam for zone monitoring
```

4. **Restart both servers:**
```bash
# Terminal 1 - PPE Detection (Camera 0)
cd ai-engine
python camera_stream_server.py

# Terminal 2 - Zone Monitoring (Camera 1)
cd ai-engine
python zone_stream_server.py
```

Now CAM-1 shows built-in webcam, CAM-2 shows USB webcam!

---

## Option 2: Two Laptops (Network Setup) 🌐

### Requirements:
- 2 laptops on same WiFi network
- Each laptop has a webcam

### Laptop 1 (Main Server):
```bash
# Run backend server
cd server
npm run dev

# Run frontend
cd client
npm run dev

# Run PPE Detection (CAM-1)
cd ai-engine
python camera_stream_server.py
```

### Laptop 2 (Zone Monitoring):
1. **Get Laptop 1's IP address:**
```bash
# Windows
ipconfig
# Look for IPv4 Address (e.g., 192.168.1.100)
```

2. **Update zone_stream_server.py on Laptop 2:**
```python
# Change API_BASE_URL to Laptop 1's IP
API_BASE_URL = "http://192.168.1.100:5000/api"  # Use Laptop 1's IP
```

3. **Run zone server on Laptop 2:**
```bash
cd ai-engine
python zone_stream_server.py
```

4. **Update frontend on Laptop 1** to point CAM-2 to Laptop 2:
```javascript
// In client/src/components/CameraGrid.jsx
const CAMERA_LABELS = [
  { id: 'CAM-1', label: 'Main Entrance - PPE Detection', zone: 'PPE Detection', type: 'ppe', port: 5001 },
  { id: 'CAM-2', label: 'Restricted Area - Zone Monitoring', zone: 'Zone Monitoring', type: 'zone', port: 5002, host: '192.168.1.101' }, // Laptop 2's IP
];

// Update streamUrl in CameraFeed component:
const streamUrl = camera.host 
  ? `http://${camera.host}:${camera.port}/video_feed/${camera.id}`
  : `http://localhost:${camera.port}/video_feed/${camera.id}`;
```

---

## Option 3: IP Cameras (Professional Setup) 📹

### Requirements:
- IP cameras with RTSP streams
- Network access to cameras

### Setup:
1. **Get RTSP URLs** from your IP cameras:
```
rtsp://username:password@192.168.1.10:554/stream1
rtsp://username:password@192.168.1.11:554/stream1
```

2. **Update camera_stream_server.py:**
```python
# Replace CAMERA_INDEX with RTSP URL
CAMERA_SOURCE = "rtsp://admin:password@192.168.1.10:554/stream1"

# In main code, replace:
cap = cv2.VideoCapture(CAMERA_INDEX, ...)
# With:
cap = cv2.VideoCapture(CAMERA_SOURCE)
```

3. **Update zone_stream_server.py** similarly with second camera's RTSP URL

---

## Quick Test - Check Available Cameras

Run this Python script to see all available cameras:

```python
import cv2

print("Testing available cameras...")
for i in range(5):
    cap = cv2.VideoCapture(i)
    if cap.isOpened():
        ret, frame = cap.read()
        if ret:
            print(f"✓ Camera {i}: Available ({frame.shape[1]}x{frame.shape[0]})")
        cap.release()
    else:
        print(f"✗ Camera {i}: Not available")
```

Save as `test_cameras.py` and run:
```bash
cd ai-engine
python test_cameras.py
```

---

## Current Status Check

To verify both servers are running:

```bash
# Check if PPE server is running (CAM-1)
curl http://localhost:5001/video_feed/CAM-1

# Check if Zone server is running (CAM-2)
curl http://localhost:5002/video_feed/CAM-2
```

Both should return video stream data (not error).

---

## Recommended for Demo: Option 1

For your hackathon demo, I recommend **Option 1** (two webcams on same laptop):
- ✅ Easy to setup (just plug in USB webcam)
- ✅ No network configuration needed
- ✅ Both cameras visible in same dashboard
- ✅ Reliable and fast

**Cost:** ~₹500-1000 for basic USB webcam

---

## Already Working!

Your current setup with 1 webcam is already functional:
- Both servers run simultaneously
- CAM-1 shows PPE detection
- CAM-2 shows zone monitoring
- Same physical camera, different AI processing

This is perfect for demo if you only have 1 webcam!
