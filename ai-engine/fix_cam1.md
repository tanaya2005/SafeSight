# 🎥 CAM-1 Webcam Fix Guide

## Problem
CAM-1 shows "Connecting..." and stays OFFLINE because it's trying to access the wrong camera index.

## Root Cause
`camera_stream_server.py` was configured with `CAMERA_INDEX = 1`, but your webcam is at index 0.

## ✅ Solution Applied
Changed `camera_stream_server.py` line 35:
```python
# Before:
CAMERA_INDEX = 1  # Wrong index

# After:
CAMERA_INDEX = 0  # Correct index for built-in webcam
```

## 🔧 Steps to Fix

### 1. Test Your Camera
First, verify which camera index works:

```bash
cd ai-engine
python test_cameras.py
```

This will show you:
- ✓ Camera 0: Available (your webcam)
- ✗ Camera 1: Not available (DroidCam when disconnected)

### 2. Start CAM-1 Server
Now start the camera server:

```bash
cd ai-engine
python camera_stream_server.py
```

You should see:
```
✓ Camera opened successfully (index 0)
✓ Flask server running on http://localhost:5001
```

### 3. Verify in Dashboard
1. Open http://localhost:5173
2. Go to Dashboard
3. CAM-1 should now show your webcam feed
4. Status should change from OFFLINE to ONLINE

## 🎯 Camera Index Guide

| Camera Index | Device | When Available |
|--------------|--------|----------------|
| 0 | Built-in Webcam | Always (if you have one) |
| 1 | DroidCam / External | Only when connected |
| 2+ | Additional cameras | Rarely used |

## 📝 Configuration Files

### For CAM-1 (PPE Detection):
- **File**: `camera_stream_server.py`
- **Line**: 35
- **Setting**: `CAMERA_INDEX = 0`
- **Port**: 5001

### For CAM-2 (Zone Monitoring):
- **File**: `zone_stream_server.py`
- **Line**: ~35
- **Setting**: `CAMERA_INDEX = 1` (for DroidCam)
- **Port**: 5002

## 🐛 Troubleshooting

### Issue: Camera still not working

**Check 1: Is another app using the camera?**
```bash
# Close these apps if open:
- Zoom
- Teams
- Skype
- OBS
- Any other camera app
```

**Check 2: Camera permissions**
- Windows: Settings → Privacy → Camera → Allow apps to access camera
- Make sure Python is allowed

**Check 3: Test with OpenCV directly**
```python
import cv2
cap = cv2.VideoCapture(0)
if cap.isOpened():
    print("✓ Camera works!")
    ret, frame = cap.read()
    if ret:
        print(f"✓ Frame captured: {frame.shape}")
else:
    print("✗ Camera failed to open")
cap.release()
```

### Issue: "Camera opened but no frames"

This usually means:
1. Camera is being used by another process
2. Camera driver issue
3. Insufficient permissions

**Solution:**
1. Restart your computer
2. Run the test script again
3. Make sure no other apps are using the camera

### Issue: CAM-1 works but CAM-2 doesn't

This is expected! CAM-2 is configured for DroidCam (index 1).

**To use CAM-2:**
1. Install DroidCam on your phone
2. Connect via USB or WiFi
3. DroidCam will appear as camera index 1
4. Start `zone_stream_server.py`

**Or use same camera for both:**
```python
# In zone_stream_server.py
CAMERA_INDEX = 0  # Use same webcam as CAM-1
```

## 🚀 Quick Start Commands

```bash
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: CAM-1 (Webcam - PPE Detection)
cd ai-engine
python camera_stream_server.py

# Terminal 3: CAM-2 (DroidCam - Zone Monitoring) - Optional
cd ai-engine
python zone_stream_server.py

# Terminal 4: Frontend
cd client
npm run dev
```

## ✅ Success Indicators

When CAM-1 is working correctly, you'll see:

**In Terminal:**
```
✓ Camera opened successfully (index 0)
✓ YOLOv8 model loaded
✓ Flask server running on http://localhost:5001
✓ Streaming at /video_feed
```

**In Dashboard:**
- CAM-1 shows live video feed
- Status: ONLINE (green)
- PPE Detection active
- Violations detected when you remove helmet/vest

## 📊 Testing PPE Detection

Once CAM-1 is working:

1. **Test Helmet Detection:**
   - Wear a helmet → Should detect "Helmet"
   - Remove helmet → Should trigger "No Helmet" violation

2. **Test Vest Detection:**
   - Wear safety vest → Should detect "Vest"
   - Remove vest → Should trigger "No Vest" violation

3. **Check Dashboard:**
   - Violations appear in real-time
   - Alert notifications show up
   - Violation count increases

## 🔄 Switching Between Cameras

If you want to test with different cameras:

```python
# camera_stream_server.py
CAMERA_INDEX = 0  # Built-in webcam
CAMERA_INDEX = 1  # DroidCam or external USB camera
CAMERA_INDEX = 2  # Second external camera (if available)
```

Remember to restart the server after changing the index!

## 📞 Still Having Issues?

1. Run the diagnostic:
   ```bash
   python test_cameras.py
   ```

2. Check the output and note which cameras are available

3. Update `CAMERA_INDEX` to match an available camera

4. Restart the camera server

5. Check browser console (F12) for any errors

---

**Status**: ✅ Fixed - CAM-1 now uses camera index 0  
**Last Updated**: March 14, 2026  
**Tested**: Windows with built-in webcam
