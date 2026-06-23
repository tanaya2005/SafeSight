"""
Test Voice Alerts for Zone Violations
Tests English, Hindi, and Marathi voice alerts
"""

import os
import sys
import time
import json
from gtts import gTTS
import io

# Load voice alerts configuration
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "voice_alerts_config.json")

print("=" * 60)
print("  Voice Alert Test - SafeSight")
print("=" * 60)

# Load config
try:
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        VOICE_CONFIG = json.load(f)
    print("✅ Voice config loaded successfully")
except Exception as e:
    print(f"❌ Failed to load config: {e}")
    sys.exit(1)

print("\n📋 Available Alerts:")
print("\nZone Alerts:")
for zone_name in VOICE_CONFIG["zone_alerts"].keys():
    print(f"  - {zone_name}")

print("\nPPE Alerts:")
for ppe_type in VOICE_CONFIG["ppe_alerts"].keys():
    print(f"  - {ppe_type}")

print("\n🌍 Available Languages:")
for lang_code, lang_name in VOICE_CONFIG["languages"].items():
    print(f"  {lang_code}: {lang_name}")

def test_alert(alert_type, alert_name, language):
    """Test a specific alert"""
    try:
        text = VOICE_CONFIG[alert_type][alert_name][language]
        print(f"\n🔊 Testing: {alert_name} ({VOICE_CONFIG['languages'][language]})")
        print(f"   Text: {text}")
        
        # Generate audio
        tts = gTTS(text=text, lang=language)
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        
        # Save to temp file
        temp_file = f"test_alert_{language}.mp3"
        with open(temp_file, 'wb') as f:
            f.write(fp.read())
        
        print(f"   ✅ Audio generated: {temp_file}")
        
        # Play audio (Windows)
        if os.name == 'nt':
            os.system(f'start /min "" "{temp_file}"')
            print(f"   🔊 Playing audio...")
        else:
            print(f"   ℹ️  Play manually: {temp_file}")
        
        return True
    except Exception as e:
        print(f"   ❌ Failed: {e}")
        return False

print("\n" + "=" * 60)
print("  Running Tests")
print("=" * 60)

# Test 1: High Danger Zone - English
print("\n[Test 1/6] High Danger Zone - English")
test_alert("zone_alerts", "High Danger Zone", "en")
time.sleep(3)

# Test 2: High Danger Zone - Hindi
print("\n[Test 2/6] High Danger Zone - Hindi")
test_alert("zone_alerts", "High Danger Zone", "hi")
time.sleep(3)

# Test 3: High Danger Zone - Marathi
print("\n[Test 3/6] High Danger Zone - Marathi")
test_alert("zone_alerts", "High Danger Zone", "mr")
time.sleep(3)

# Test 4: Low Danger Zone - English
print("\n[Test 4/6] Low Danger Zone - English")
test_alert("zone_alerts", "Low Danger Zone", "en")
time.sleep(3)

# Test 5: No Helmet - Hindi
print("\n[Test 5/6] No Helmet - Hindi")
test_alert("ppe_alerts", "No Helmet", "hi")
time.sleep(3)

# Test 6: No Safety Vest - Marathi
print("\n[Test 6/6] No Safety Vest - Marathi")
test_alert("ppe_alerts", "No Safety Vest", "mr")

print("\n" + "=" * 60)
print("  Test Complete!")
print("=" * 60)
print("\n💡 To change language in production:")
print("   Edit ai-engine/.env and set VOICE_ALERT_LANG=hi (or mr)")
print("\n📝 Audio files saved as test_alert_*.mp3")
print("   You can play them manually to verify quality")
