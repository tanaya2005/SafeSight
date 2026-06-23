# Voice Alerts Implementation Guide

## Overview
SafeSight now supports multilingual voice alerts for both PPE violations and restricted zone intrusions in English, Hindi, and Marathi.

## Features

### Supported Languages
- **English (en)** - Default
- **Hindi (hi)** - हिंदी
- **Marathi (mr)** - मराठी

### Alert Types

#### Zone Alerts
1. **High Danger Zone**
   - English: "Warning! Worker entered High Danger Zone. Immediate evacuation required."
   - Hindi: "चेतावनी! कर्मचारी उच्च खतरे वाले क्षेत्र में प्रवेश कर गया है। तुरंत निकासी आवश्यक है।"
   - Marathi: "चेतावणी! कामगार उच्च धोक्याच्या क्षेत्रात प्रवेश केला आहे। तात्काळ बाहेर पडणे आवश्यक आहे।"

2. **Gas Leak Zone**
   - English: "Alert! Worker detected in Gas Leak Zone. Please evacuate immediately."
   - Hindi: "सतर्कता! गैस रिसाव क्षेत्र में कर्मचारी का पता चला। कृपया तुरंत निकल जाएं।"
   - Marathi: "सावधान! गॅस गळती क्षेत्रात कामगार आढळला. कृपया ताबडतोब बाहेर पडा।"

#### PPE Alerts
1. **No Helmet**
   - English: "Safety violation! Worker without helmet detected."
   - Hindi: "सुरक्षा उल्लंघन! हेलमेट के बिना कर्मचारी का पता चला।"
   - Marathi: "सुरक्षा उल्लंघन! हेल्मेट शिवाय कामगार आढळला."

2. **No Safety Vest**
   - English: "Safety violation! Worker without safety vest detected."
   - Hindi: "सुरक्षा उल्लंघन! सुरक्षा जैकेट के बिना कर्मचारी का पता चला।"
   - Marathi: "सुरक्षा उल्लंघन! सुरक्षा जॅकेट शिवाय कामगार आढळला."

## Configuration

### 1. Set Language in .env File

Edit `ai-engine/.env`:

```env
# English (Default)
VOICE_ALERT_LANG=en

# Hindi
VOICE_ALERT_LANG=hi

# Marathi
VOICE_ALERT_LANG=mr
```

### 2. Voice Alert Configuration File

The alerts are configured in `ai-engine/voice_alerts_config.json`. You can add more alerts or languages by editing this file.

## Implementation Details

### Zone Stream Server (CAM-2)
File: `ai-engine/zone_stream_server.py`

**Features:**
- Automatic voice alerts when worker enters restricted zone
- Cooldown mechanism (18 seconds) to prevent alert spam
- Multi-language support via environment variable
- Background audio playback (non-blocking)

**How it works:**
1. Worker enters restricted zone
2. System detects intrusion
3. Sends violation to backend
4. Triggers voice alert in configured language
5. Plays audio in background thread

### Camera Stream Server (CAM-1)
File: `ai-engine/camera_stream_server.py`

**Features:**
- Voice alerts for PPE violations (already implemented)
- Audio generation endpoint at `/api/audio`

## Testing

### Test Voice Alerts
```bash
cd ai-engine
python test_voice_alerts.py
```

This will:
- Test all zone alerts in all languages
- Test PPE alerts in all languages
- Generate sample audio files
- Play alerts automatically (Windows)

### Manual Testing
1. Start zone monitoring server:
   ```bash
   python zone_stream_server.py
   ```

2. Enter a restricted zone in front of camera

3. Listen for voice alert in configured language

## API Endpoints

### Generate Audio (Both Servers)
```
GET /api/audio?text=<message>&lang=<language>
```

**Parameters:**
- `text`: Alert message to speak
- `lang`: Language code (en-US, hi-IN, mr-IN)

**Example:**
```
http://localhost:5002/api/audio?text=Warning&lang=en-US
```

**Response:** MP3 audio file

## Troubleshooting

### No Audio Playing

**Issue:** Voice alerts not playing

**Solutions:**
1. Check if gTTS is installed:
   ```bash
   pip install gTTS
   ```

2. Verify audio files are being created:
   ```bash
   ls temp_alert_*.mp3
   ```

3. Test audio generation:
   ```bash
   python test_voice_alerts.py
   ```

4. Check system audio settings (volume, mute)

### Wrong Language

**Issue:** Alerts playing in wrong language

**Solution:**
1. Check `.env` file:
   ```bash
   cat ai-engine/.env | grep VOICE_ALERT_LANG
   ```

2. Restart the server after changing language

### Alert Spam

**Issue:** Too many alerts playing

**Solution:**
- Cooldown is set to 18 seconds per zone per worker
- Adjust `VIOLATION_COOLDOWN` in `zone_stream_server.py`

### Audio Delay

**Issue:** Audio plays with delay

**Solution:**
- Audio generation happens in background thread (non-blocking)
- First-time generation may be slower (gTTS API call)
- Subsequent alerts use cached audio

## Adding New Alerts

### 1. Edit Configuration File
Edit `ai-engine/voice_alerts_config.json`:

```json
{
  "zone_alerts": {
    "Your New Zone": {
      "en": "English message",
      "hi": "Hindi message",
      "mr": "Marathi message"
    }
  }
}
```

### 2. Add Zone Definition
Edit `zone_stream_server.py`:

```python
ZONE_DEFINITIONS = [
    {
        "polygon": np.array([[x1, y1], [x2, y2], ...], np.int32),
        "color": (B, G, R),
        "name": "Your New Zone",
        "severity": "critical"
    }
]
```

### 3. Test
```bash
python test_voice_alerts.py
```

## Performance Considerations

### Audio Generation
- First alert: ~1-2 seconds (gTTS API call)
- Subsequent alerts: Instant (if within cooldown)
- Background thread: Non-blocking

### Memory Usage
- Temporary audio files created and deleted
- Minimal memory footprint
- Automatic cleanup after playback

### Network Usage
- gTTS requires internet connection
- Audio generated on-demand
- Cached per alert type

## Best Practices

1. **Language Selection**
   - Choose language based on worker demographics
   - Test alerts with actual workers
   - Consider using multiple languages in multilingual sites

2. **Alert Frequency**
   - Keep cooldown at 15-20 seconds
   - Avoid alert fatigue
   - Critical zones can have shorter cooldown

3. **Audio Quality**
   - gTTS provides natural-sounding speech
   - Test audio clarity in noisy environments
   - Consider volume levels

4. **Customization**
   - Customize alert messages for your site
   - Add site-specific terminology
   - Include worker ID in alerts if needed

## Integration with Dashboard

Voice alerts work alongside visual alerts:
1. Worker enters zone → Visual alert on dashboard
2. Violation sent to backend → Logged in database
3. Voice alert plays → Audio notification
4. All three happen simultaneously

## Future Enhancements

Potential improvements:
- [ ] Offline audio caching
- [ ] Custom voice recordings
- [ ] Volume control via UI
- [ ] Alert priority levels
- [ ] SMS/Email integration
- [ ] Worker-specific alerts
- [ ] Alert history playback

## Support

For issues or questions:
1. Check this guide
2. Run test scripts
3. Check server logs
4. Verify configuration files

## Summary

✅ **Implemented:**
- Multi-language voice alerts (English, Hindi, Marathi)
- Zone intrusion alerts
- PPE violation alerts
- Cooldown mechanism
- Background audio playback
- Configuration via .env
- Test scripts

✅ **Working:**
- CAM-1: PPE alerts with voice
- CAM-2: Zone alerts with voice
- Dashboard: Visual alerts
- Backend: Violation logging

🎉 **Complete voice alert system for SafeSight!**
