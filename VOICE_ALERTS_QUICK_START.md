# Voice Alerts - Quick Start Guide

## 🎯 What's New

✅ **Zone intrusion alerts now have voice notifications!**
- English, Hindi, and Marathi support
- Automatic playback when worker enters restricted zone
- Works alongside existing PPE voice alerts

## 🚀 Quick Setup (3 Steps)

### Step 1: Verify Installation
```bash
cd ai-engine
python setup_voice_alerts.py
```

### Step 2: Choose Language
Edit `ai-engine/.env`:
```env
VOICE_ALERT_LANG=en    # English (default)
# VOICE_ALERT_LANG=hi  # Hindi
# VOICE_ALERT_LANG=mr  # Marathi
```

### Step 3: Test Alerts
```bash
python test_voice_alerts.py
```

## 🔊 How It Works

### Zone Alerts (CAM-2)
1. Worker enters restricted zone
2. Visual alert on dashboard ✅
3. Violation logged to database ✅
4. **Voice alert plays** ✅ (NEW!)

### PPE Alerts (CAM-1)
1. Worker without helmet detected
2. Visual alert on dashboard ✅
3. Violation logged to database ✅
4. Voice alert plays ✅ (Already working)

## 📝 Alert Messages

### High Danger Zone
- **English:** "Warning! Worker entered High Danger Zone. Immediate evacuation required."
- **Hindi:** "चेतावनी! कर्मचारी उच्च खतरे वाले क्षेत्र में प्रवेश कर गया है।"
- **Marathi:** "चेतावणी! कामगार उच्च धोक्याच्या क्षेत्रात प्रवेश केला आहे।"

### Gas Leak Zone
- **English:** "Alert! Worker detected in Gas Leak Zone. Please evacuate immediately."
- **Hindi:** "सतर्कता! गैस रिसाव क्षेत्र में कर्मचारी का पता चला।"
- **Marathi:** "सावधान! गॅस गळती क्षेत्रात कामगार आढळला."

## 🛠️ Troubleshooting

### No Voice Alerts?

**Check 1:** Is gTTS installed?
```bash
pip install gTTS
```

**Check 2:** Is internet connected? (gTTS needs internet)

**Check 3:** Is language set correctly?
```bash
cat ai-engine/.env | grep VOICE_ALERT_LANG
```

**Check 4:** Restart the server
```bash
# Stop zone_stream_server.py
# Start again
python zone_stream_server.py
```

### Wrong Language?

Edit `.env` file:
```env
VOICE_ALERT_LANG=hi    # Change to hi or mr
```

Then restart server.

### Alert Spam?

Cooldown is 18 seconds per zone. To change:
Edit `zone_stream_server.py`:
```python
VIOLATION_COOLDOWN = 18  # Change this value
```

## 📊 What Was Fixed

### Before
- ❌ Zone alerts: Visual only, no voice
- ✅ PPE alerts: Visual + voice

### After
- ✅ Zone alerts: Visual + voice (FIXED!)
- ✅ PPE alerts: Visual + voice (Still working)

## 🎨 Files Added/Modified

### New Files
- `ai-engine/voice_alerts_config.json` - Alert messages
- `ai-engine/voice_alert_helper.py` - Helper functions
- `ai-engine/test_voice_alerts.py` - Test script
- `ai-engine/setup_voice_alerts.py` - Setup verification
- `VOICE_ALERTS_GUIDE.md` - Full documentation
- `VOICE_ALERTS_QUICK_START.md` - This file

### Modified Files
- `ai-engine/zone_stream_server.py` - Added voice alerts
- `ai-engine/.env` - Added VOICE_ALERT_LANG
- `.env.example` - Added VOICE_ALERT_LANG

## 🧪 Testing Commands

```bash
# Verify setup
python setup_voice_alerts.py

# Test all alerts
python test_voice_alerts.py

# Start zone monitoring with voice alerts
python zone_stream_server.py

# Start PPE monitoring (already has voice)
python camera_stream_server.py
```

## 💡 Pro Tips

1. **Test before deployment:** Run `test_voice_alerts.py` to hear all alerts
2. **Choose right language:** Match worker language preference
3. **Volume check:** Ensure system volume is adequate
4. **Internet required:** gTTS needs internet for first-time generation
5. **Cooldown prevents spam:** 18 seconds between same alerts

## 📞 Quick Reference

| Feature | Status | File |
|---------|--------|------|
| Zone voice alerts | ✅ Working | zone_stream_server.py |
| PPE voice alerts | ✅ Working | camera_stream_server.py |
| Multi-language | ✅ Working | voice_alerts_config.json |
| Dashboard alerts | ✅ Working | Backend API |

## 🎉 Summary

**Problem:** Zone alerts had no voice notifications
**Solution:** Added multilingual voice alerts for all zone violations
**Result:** Complete audio + visual alert system for both PPE and zones!

---

**Need help?** Check `VOICE_ALERTS_GUIDE.md` for detailed documentation.
