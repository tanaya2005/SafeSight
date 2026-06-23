# 🎥 Camera Configuration - Quick Start

## Step 1: Find Your Cameras
```bash
cd ai-engine
python test_cameras.py
```

## Step 2: Edit .env File
Create or edit `ai-engine/.env`:
```env
CAM_PPE_INDEX=1          # Your PPE camera index
CAM_ZONE_INDEX=2         # Your zone monitoring camera index
CAM_WEBCAM_INDEX=0       # Your default webcam
```

## Step 3: Install Dependencies
```bash
cd ai-engine
pip install python-dotenv
```

## Step 4: Run Your Servers
```bash
# PPE Detection
python camera_stream_server.py

# Zone Monitoring
python zone_stream_server.py

# Testing
python advanced_safety_inspector.py
```

## ✅ What Changed

### Before (Hardcoded)
```python
CAMERA_INDEX = 1  # Fixed value
```

### After (Environment Variable)
```python
CAMERA_INDEX = int(os.getenv('CAM_PPE_INDEX', 1))  # Flexible!
```

## 🎯 Benefits

1. **No Code Changes** - Just edit .env file
2. **Team Friendly** - Everyone can use their own camera setup
3. **No Warnings** - Clean console output
4. **Easy Testing** - Switch cameras without editing code

## 📝 Example Setups

### Your Setup (Webcam on 0, DroidCam on 1)
```env
CAM_PPE_INDEX=0
CAM_ZONE_INDEX=1
CAM_WEBCAM_INDEX=0
```

### Friend's Setup (Webcam on 0, DroidCam on 3)
```env
CAM_PPE_INDEX=0
CAM_ZONE_INDEX=3
CAM_WEBCAM_INDEX=0
```

## 🚫 No More Warnings!

All files now include:
```python
import warnings
warnings.filterwarnings('ignore')
```

Clean output = Happy debugging! 🎉
