# 📱 DroidCam Setup Guide for Safe-Sight

## Why DroidCam?
DroidCam lets you use your phone as a webcam, giving you a second camera for CAM-2 (Zone Monitoring).

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Install DroidCam Client on PC

1. **Download DroidCam Client**
   - Go to: https://www.dev47apps.com/droidcam/windows/
   - Click "Download DroidCam Client"
   - Run the installer
   - Follow installation steps

2. **Install Drivers**
   - The installer will install camera drivers
   - You may need to restart your PC

### Step 2: Install DroidCam App on Phone

**For Android:**
1. Open Google Play Store
2. Search "DroidCam Wireless Webcam"
3. Install the app by Dev47Apps
4. Open the app

**For iOS:**
1. Open App Store
2. Search "DroidCam Webcam & OBS Camera"
3. Install the app
4. Open the app

### Step 3: Connect Phone to PC

#### Method A: USB Connection (Recommended - More Stable)

**On Phone:**
1. Enable USB Debugging:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times (enables Developer Options)
   - Go to Settings → Developer Options
   - Enable "USB Debugging"

2. Connect phone to PC via USB cable

3. Open DroidCam app on phone
   - You'll see "USB" option available

**On PC:**
1. Open DroidCam Client
2. Select "USB" connection type
3. Click "Start"
4. You should see your phone's camera feed!

#### Method B: WiFi Connection (Wireless)

**On Phone:**
1. Connect to same WiFi as your PC
2. Open DroidCam app
3. Note the WiFi IP address shown (e.g., 192.168.1.100)
4. Note the Port (usually 4747)

**On PC:**
1. Open DroidCam Client
2. Select "WiFi" connection type
3. Enter the IP address from phone
4. Enter the Port (4747)
5. Click "Start"
6. You should see your phone's camera feed!

### Step 4: Verify DroidCam is Working

**Test in DroidCam Client:**
- You should see live video from your phone
- Try moving the phone - video should update

**Test in Windows Camera App:**
1. Open Windows Camera app
2. Click the camera switch button
3. You should see "DroidCam Source" as an option
4. Select it - you should see phone camera

**Test with Python:**
```bash
cd ai-engine
python test_cameras.py
```

Expected output:
```
✓ Camera 0: Available (Built-in Webcam)
  Resolution: 1280x720

✓ Camera 1: Available (DroidCam)
  Resolution: 640x480
```

---

## 🔧 Troubleshooting

### Issue: DroidCam Client says "Connection Failed"

**USB Connection:**
- Make sure USB Debugging is enabled
- Try a different USB cable
- Try a different USB port
- Restart both phone and PC

**WiFi Connection:**
- Make sure both devices are on same WiFi network
- Check if firewall is blocking connection
- Try disabling Windows Firewall temporarily
- Make sure phone isn't in power saving mode

### Issue: Camera 1 not showing in test_cameras.py

**Possible causes:**
1. DroidCam Client not running
2. Phone not connected
3. DroidCam drivers not installed

**Solutions:**
1. Make sure DroidCam Client shows "Connected"
2. Restart DroidCam Client
3. Reinstall DroidCam Client (includes drivers)
4. Restart your PC

### Issue: "Could not open camera 1" in zone_stream_server.py

**This means:**
- DroidCam is not properly connected
- Camera index 1 is not available

**Solutions:**
1. Open DroidCam Client and connect phone
2. Run `python test_cameras.py` to verify
3. Make sure DroidCam Client shows "Connected"
4. Try closing and reopening DroidCam Client

### Issue: Video is laggy or freezing

**Solutions:**
1. Use USB connection instead of WiFi (more stable)
2. Lower video quality in DroidCam Client settings
3. Close other apps on phone
4. Make sure phone has good WiFi signal (if using WiFi)

---

## ⚙️ DroidCam Settings (Optional)

In DroidCam Client, you can adjust:

- **Video Quality**: Lower for better performance
- **Resolution**: 640x480 is good for Safe-Sight
- **FPS**: 30 FPS is sufficient
- **Audio**: Can be disabled (not needed for Safe-Sight)

---

## 🎯 Using DroidCam with Safe-Sight

Once DroidCam is connected and showing as Camera 1:

### Step 1: Verify Camera Index
```bash
cd ai-engine
python test_cameras.py
```

Should show:
```
✓ Camera 0: Available (Webcam)
✓ Camera 1: Available (DroidCam)  ← This is what you need!
```

### Step 2: Update zone_stream_server.py (if needed)
```python
# Line 24 should be:
CAMERA_INDEX = 1  # DroidCam
```

### Step 3: Start Zone Server
```bash
python zone_stream_server.py
```

Should show:
```
✅ YOLOv8 model loaded
✅ Camera opened successfully
🎬 Zone monitoring active
```

### Step 4: Check Dashboard
- Open http://localhost:5173
- CAM-1 should show your webcam
- CAM-2 should show your phone camera (DroidCam)

---

## 📱 Phone Positioning Tips

For best zone monitoring:

1. **Mount phone at an angle**
   - Use a phone stand or tripod
   - Point at the area you want to monitor

2. **Good lighting**
   - Make sure area is well-lit
   - Avoid backlighting

3. **Stable position**
   - Don't hold the phone
   - Use a stand to keep it steady

4. **Keep phone charged**
   - Connect to charger if using for long time
   - DroidCam can drain battery

---

## 🔄 Quick Commands

```bash
# Test if DroidCam is detected
cd ai-engine
python test_cameras.py

# Start CAM-1 (Webcam)
python camera_stream_server.py

# Start CAM-2 (DroidCam)
python zone_stream_server.py

# If DroidCam not working, use webcam for both
# Edit zone_stream_server.py line 24:
# CAMERA_INDEX = 0
```

---

## ✅ Success Checklist

- [ ] DroidCam Client installed on PC
- [ ] DroidCam app installed on phone
- [ ] Phone connected (USB or WiFi)
- [ ] DroidCam Client shows "Connected"
- [ ] Can see phone camera in DroidCam Client
- [ ] `test_cameras.py` shows Camera 1 available
- [ ] `zone_stream_server.py` starts without errors
- [ ] Dashboard shows CAM-2 with phone camera feed

---

## 🆘 Still Not Working?

### Last Resort Options:

**Option 1: Use IP Webcam (Alternative App)**
- Install "IP Webcam" app instead
- Easier WiFi setup
- More stable sometimes

**Option 2: Use External USB Webcam**
- Buy a cheap USB webcam
- Plug into PC
- Will appear as Camera 1

**Option 3: Use Same Webcam for Both**
- Set `CAMERA_INDEX = 0` in zone_stream_server.py
- Both cameras show same feed
- Still works for demo!

---

## 📞 Support Links

- DroidCam Official Site: https://www.dev47apps.com/
- DroidCam FAQ: https://www.dev47apps.com/droidcam/faq/
- DroidCam Support: support@dev47apps.com

---

**Status**: Ready for DroidCam setup  
**Estimated Time**: 5-10 minutes  
**Difficulty**: Easy  
**Recommended**: USB connection for stability
