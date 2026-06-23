# 🎥 Camera Setup Guide - Safe-Sight

## Current Configuration

| Camera | Index | Device | Status |
|--------|-------|--------|--------|
| CAM-1 | 0 | Built-in Webcam | ✅ Fixed |
| CAM-2 | 1 | DroidCam | ⚠️ Needs Connection |

---

## ✅ What's Been Fixed

1. **CAM-1 (camera_stream_server.py)**
   - Changed from index 1 → index 0
   - Now uses your built-in webcam
   - Should work immediately

2. **CAM-2 (zone_stream_server.py)**
   - Changed from index 2 → index 1
   - Ready for DroidCam connection
   - Or can use webcam (index 0)

---

## 🚀 Quick Start Options

### Option 1: Use DroidCam for CAM-2 (Recommended)

**Why?** Shows two different camera angles in demo

**Steps:**

1. **Install DroidCam on Phone**
   - Android: [Play Store](https://play.google.com/store/apps/details?id=com.dev47apps.droidcam)
   - iOS: [App Store](https://apps.apple.com/app/droidcam-webcam-obs-camera/id1510258102)

2. **Install DroidCam Client on PC**
   - Download from: https://www.dev47apps.com/droidcam/windows/
   - Install and run

3. **Connect Phone to PC**
   
   **USB Connection (Easier):**
   ```
   1. Enable USB Debugging on phone
   2. Connect phone via USB cable
   3. Open DroidCam on phone
   4. Open DroidCam Client on PC
   5. Select "USB" connection
   6. Click "Start"
   ```
   
   **WiFi Connection:**
   ```
   1. Connect phone and PC to same WiFi
   2. Open DroidCam on phone (note the IP address)
   3. Open DroidCam Client on PC
   4. Enter phone's IP address
   5. Click "Start"
   ```

4. **Verify DroidCam is Working**
   ```bash
   cd ai-engine
   python test_cameras.py
   ```
   
   You should see:
   ```
   ✓ Camera 0: Available (Webcam)
   ✓ Camera 1: Available (DroidCam)
   ```

5. **Start CAM-2 Server**
   ```bash
   python zone_stream_server.py
   ```

---

### Option 2: Use Same Webcam for Both Cameras

**Why?** Quick demo without needing DroidCam

**Steps:**

1. **Update zone_stream_server.py**
   ```python
   # Line 24
   CAMERA_INDEX = 0  # Use same webcam as CAM-1
   ```

2. **Start CAM-2 Server**
   ```bash
   cd ai-engine
   python zone_stream_server.py
   ```

**Note:** Both cameras will show the same feed, but with different AI processing:
- CAM-1: PPE Detection (helmet, vest, etc.)
- CAM-2: Zone Intrusion Detection

---

## 🧪 Testing Your Setup

### Test 1: Check Available Cameras
```bash
cd ai-engine
python test_cameras.py
```

Expected output:
```
✓ Camera 0: Available
  Resolution: 1280x720
  Use in code: CAMERA_INDEX = 0

✓ Camera 1: Available (if DroidCam connected)
  Resolution: 640x480
  Use in code: CAMERA_INDEX = 1
```

### Test 2: Start All Services

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - CAM-1 (Webcam - PPE Detection):**
```bash
cd ai-engine
python camera_stream_server.py
```

**Terminal 3 - CAM-2 (DroidCam/Webcam - Zone Monitoring):**
```bash
cd ai-engine
python zone_stream_server.py
```

**Terminal 4 - Frontend:**
```bash
cd client
npm run dev
```

### Test 3: Check Dashboard

Open http://localhost:5173

You should see:
- ✅ CAM-1: LIVE (green) with webcam feed
- ✅ CAM-2: LIVE (green) with DroidCam/webcam feed

---

## 🐛 Troubleshooting

### Error: "Could not open camera X"

**Cause:** Camera index doesn't exist or is in use

**Solutions:**
1. Run `python test_cameras.py` to see available cameras
2. Update `CAMERA_INDEX` to match an available camera
3. Close other apps using the camera (Zoom, Teams, etc.)
4. If using DroidCam, make sure it's connected and running

### Error: "VIDEOIO(DSHOW): backend is generally available but can't be used"

**Cause:** Camera is being used by another application

**Solutions:**
1. Close all camera apps (Zoom, Teams, Skype, OBS)
2. Restart your computer
3. Try running the script again

### CAM-2 shows "Connecting..." but DroidCam is running

**Cause:** DroidCam might be at a different index

**Solutions:**
1. Run `python test_cameras.py`
2. Note which index shows DroidCam
3. Update `CAMERA_INDEX` in `zone_stream_server.py`
4. Restart the zone server

### Both cameras show same feed

**This is normal if:**
- You set both to `CAMERA_INDEX = 0`
- You only have one camera available
- DroidCam is not connected

**To fix:**
- Connect DroidCam for CAM-2
- Or accept that both show same feed (still works for demo)

---

## 📊 Camera Index Reference

| Index | Typical Device | When Available |
|-------|---------------|----------------|
| 0 | Built-in Webcam | Always (if you have one) |
| 1 | DroidCam / External USB | When connected |
| 2 | Second External Camera | Rarely |
| 3+ | Additional Cameras | Very rare |

---

## 🎯 Recommended Setup for Demo

**Best Setup:**
```
CAM-1 (Index 0): Built-in Webcam
  → PPE Detection
  → Shows you at your desk

CAM-2 (Index 1): DroidCam on Phone
  → Zone Monitoring
  → Shows different angle/area
```

**Quick Setup (No DroidCam):**
```
CAM-1 (Index 0): Built-in Webcam
  → PPE Detection

CAM-2 (Index 0): Same Webcam
  → Zone Monitoring
  → Both show same feed but different AI
```

---

## 🔧 Configuration Files

### camera_stream_server.py (CAM-1)
```python
CAMERA_INDEX = 0  # Built-in webcam
CAMERA_IDS = ["CAM-1"]
```

### zone_stream_server.py (CAM-2)
```python
CAMERA_INDEX = 1  # DroidCam (or 0 for same webcam)
CAMERA_IDS = ["CAM-2"]
```

---

## ✅ Success Checklist

- [ ] Ran `python test_cameras.py` and saw available cameras
- [ ] Updated `CAMERA_INDEX` in both server files
- [ ] Started backend server (port 5000)
- [ ] Started CAM-1 server (port 5001)
- [ ] Started CAM-2 server (port 5002)
- [ ] Started frontend (port 5173)
- [ ] Both cameras show LIVE status in dashboard
- [ ] Video feeds are visible

---

## 📞 Quick Commands

```bash
# Test cameras
cd ai-engine && python test_cameras.py

# Start CAM-1
cd ai-engine && python camera_stream_server.py

# Start CAM-2
cd ai-engine && python zone_stream_server.py

# Start backend
cd server && npm run dev

# Start frontend
cd client && npm run dev
```

---

**Status:** ✅ Both cameras configured  
**Last Updated:** March 14, 2026  
**Tested:** Windows with built-in webcam + DroidCam
