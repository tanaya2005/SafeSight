# Camera Configuration Guide

## Quick Setup

### 1. Find Your Camera Indices
Run the test script to see all available cameras:
```bash
cd ai-engine
python test_cameras.py
```

This will show output like:
```
✓ Camera 0: Available (Your Webcam)
✓ Camera 1: Available (DroidCam)
✓ Camera 2: Available (External Camera)
```

### 2. Configure Camera Indices
Edit the `.env` file in the `ai-engine` folder:

```bash
# ai-engine/.env
CAM_PPE_INDEX=1          # Camera for PPE Detection (CAM-1)
CAM_ZONE_INDEX=2         # Camera for Zone Monitoring (CAM-2)
CAM_WEBCAM_INDEX=0       # Default webcam for testing
```

### 3. Install Dependencies
```bash
pip install python-dotenv
```

Or install all requirements:
```bash
pip install -r requirements.txt
```

## Camera Assignment

| Variable | Purpose | Default | Your Setup |
|----------|---------|---------|------------|
| `CAM_PPE_INDEX` | PPE Detection Stream (CAM-1) | 1 | ___ |
| `CAM_ZONE_INDEX` | Zone Monitoring Stream (CAM-2) | 2 | ___ |
| `CAM_WEBCAM_INDEX` | Testing/Development | 0 | ___ |

## Example Configurations

### Configuration 1: Single Webcam
```env
CAM_PPE_INDEX=0
CAM_ZONE_INDEX=0
CAM_WEBCAM_INDEX=0
```

### Configuration 2: Webcam + DroidCam
```env
CAM_PPE_INDEX=0          # Built-in webcam
CAM_ZONE_INDEX=1         # DroidCam
CAM_WEBCAM_INDEX=0       # Testing
```

### Configuration 3: Multiple External Cameras
```env
CAM_PPE_INDEX=1          # External camera 1
CAM_ZONE_INDEX=2         # External camera 2
CAM_WEBCAM_INDEX=0       # Built-in webcam
```

## Files That Use Camera Indices

1. **camera_stream_server.py** - Uses `CAM_PPE_INDEX`
2. **zone_stream_server.py** - Uses `CAM_ZONE_INDEX`
3. **detect_ppe_webcam.py** - Uses `CAM_WEBCAM_INDEX`
4. **advanced_safety_inspector.py** - Uses `CAM_WEBCAM_INDEX`

## Troubleshooting

### Camera Not Found
```
❌ Could not open camera 2
```
**Solution:** Run `python test_cameras.py` and update your `.env` file with correct indices.

### Wrong Camera Selected
**Solution:** Check which camera index corresponds to which physical camera using `test_cameras.py`.

### DroidCam Not Detected
**Solution:** 
1. Make sure DroidCam is running on your phone
2. Connect via USB or WiFi
3. Run `test_cameras.py` to find the new camera index
4. Update `.env` file

## No Warnings!

All TensorFlow, YOLO, and other library warnings are now suppressed using:
```python
import warnings
warnings.filterwarnings('ignore')
```

Clean console output for better debugging! 🎉
