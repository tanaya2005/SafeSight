"""
Quick Setup and Test for Voice Alerts
Verifies all dependencies and configuration
"""

import os
import sys

print("=" * 60)
print("  SafeSight Voice Alerts - Setup & Verification")
print("=" * 60)

# Check 1: gTTS installed
print("\n[1/5] Checking gTTS installation...")
try:
    from gtts import gTTS
    print("✅ gTTS is installed")
except ImportError:
    print("❌ gTTS not found")
    print("   Install with: pip install gTTS")
    sys.exit(1)

# Check 2: Voice config file exists
print("\n[2/5] Checking voice configuration file...")
config_path = os.path.join(os.path.dirname(__file__), "voice_alerts_config.json")
if os.path.exists(config_path):
    print(f"✅ Config file found: {config_path}")
    
    # Load and validate
    import json
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        # Check structure
        assert "zone_alerts" in config
        assert "ppe_alerts" in config
        assert "languages" in config
        
        print(f"   - Zone alerts: {len(config['zone_alerts'])}")
        print(f"   - PPE alerts: {len(config['ppe_alerts'])}")
        print(f"   - Languages: {', '.join(config['languages'].keys())}")
        
    except Exception as e:
        print(f"❌ Config file invalid: {e}")
        sys.exit(1)
else:
    print(f"❌ Config file not found: {config_path}")
    sys.exit(1)

# Check 3: .env file exists
print("\n[3/5] Checking .env configuration...")
env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    print(f"✅ .env file found: {env_path}")
    
    # Check for VOICE_ALERT_LANG
    from dotenv import load_dotenv
    load_dotenv()
    
    lang = os.getenv('VOICE_ALERT_LANG', 'NOT SET')
    print(f"   - VOICE_ALERT_LANG: {lang}")
    
    if lang in ['en', 'hi', 'mr']:
        print(f"   ✅ Valid language: {lang}")
    else:
        print(f"   ⚠️  Language not set, using default: en")
else:
    print(f"⚠️  .env file not found, using defaults")

# Check 4: Test audio generation
print("\n[4/5] Testing audio generation...")
try:
    from gtts import gTTS
    import io
    
    test_text = "Test alert"
    tts = gTTS(text=test_text, lang='en')
    fp = io.BytesIO()
    tts.write_to_fp(fp)
    
    print(f"✅ Audio generation working")
    print(f"   - Generated {len(fp.getvalue())} bytes")
    
except Exception as e:
    print(f"❌ Audio generation failed: {e}")
    print("   Check internet connection (gTTS requires internet)")
    sys.exit(1)

# Check 5: Test file writing
print("\n[5/5] Testing audio file creation...")
try:
    test_file = "test_setup_audio.mp3"
    tts = gTTS(text="Setup test", lang='en')
    tts.save(test_file)
    
    if os.path.exists(test_file):
        size = os.path.getsize(test_file)
        print(f"✅ Audio file created: {test_file} ({size} bytes)")
        
        # Clean up
        os.remove(test_file)
        print(f"   - Cleanup successful")
    else:
        print(f"❌ File creation failed")
        sys.exit(1)
        
except Exception as e:
    print(f"❌ File creation failed: {e}")
    sys.exit(1)

# Summary
print("\n" + "=" * 60)
print("  ✅ All Checks Passed!")
print("=" * 60)
print("\n📋 Configuration Summary:")
print(f"   - Voice alerts: ENABLED")
print(f"   - Language: {os.getenv('VOICE_ALERT_LANG', 'en')}")
print(f"   - Zone alerts: {len(config['zone_alerts'])} configured")
print(f"   - PPE alerts: {len(config['ppe_alerts'])} configured")

print("\n🚀 Next Steps:")
print("   1. Start zone monitoring: python zone_stream_server.py")
print("   2. Test voice alerts: python test_voice_alerts.py")
print("   3. Change language: Edit .env file (VOICE_ALERT_LANG)")

print("\n💡 Language Options:")
print("   - en: English (Default)")
print("   - hi: Hindi (हिंदी)")
print("   - mr: Marathi (मराठी)")

print("\n" + "=" * 60)
