"""
Voice Alert Helper for SafeSight
Generates multilingual voice alerts for zone and PPE violations
"""

import json
import os
import requests
from gtts import gTTS
import io
import pygame
import threading
import time

# Load voice alerts configuration
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "voice_alerts_config.json")

with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
    VOICE_CONFIG = json.load(f)

# Initialize pygame mixer for audio playback
try:
    pygame.mixer.init()
    AUDIO_ENABLED = True
except:
    AUDIO_ENABLED = False
    print("⚠️  Audio playback disabled (pygame not available)")

# Cooldown tracking to prevent alert spam
_alert_cooldown = {}
COOLDOWN_SECONDS = 10

def get_alert_text(alert_type, violation_name, language="en"):
    """
    Get the alert text for a specific violation in the specified language
    
    Args:
        alert_type: "zone_alerts" or "ppe_alerts"
        violation_name: Name of the violation (e.g., "High Danger Zone", "No Helmet")
        language: Language code ("en", "hi", "mr")
    
    Returns:
        Alert text string
    """
    try:
        return VOICE_CONFIG[alert_type][violation_name][language]
    except KeyError:
        # Fallback to English
        try:
            return VOICE_CONFIG[alert_type][violation_name]["en"]
        except KeyError:
            return f"Alert: {violation_name}"

def play_voice_alert(text, language="en", async_play=True):
    """
    Generate and play voice alert
    
    Args:
        text: Alert text to speak
        language: Language code ("en", "hi", "mr")
        async_play: If True, play in background thread
    """
    if not AUDIO_ENABLED:
        print(f"🔊 [AUDIO DISABLED] {text}")
        return
    
    # Check cooldown
    alert_key = f"{text}_{language}"
    now = time.time()
    
    if alert_key in _alert_cooldown:
        if now - _alert_cooldown[alert_key] < COOLDOWN_SECONDS:
            return  # Skip - too soon
    
    _alert_cooldown[alert_key] = now
    
    def _play():
        try:
            # Generate speech
            tts = gTTS(text=text, lang=language)
            fp = io.BytesIO()
            tts.write_to_fp(fp)
            fp.seek(0)
            
            # Play audio
            pygame.mixer.music.load(fp, 'mp3')
            pygame.mixer.music.play()
            
            # Wait for playback to finish
            while pygame.mixer.music.get_busy():
                time.sleep(0.1)
            
            print(f"🔊 Voice alert played: {text[:50]}...")
        except Exception as e:
            print(f"❌ Voice alert failed: {e}")
    
    if async_play:
        threading.Thread(target=_play, daemon=True).start()
    else:
        _play()

def play_zone_alert(zone_name, language="en"):
    """
    Play voice alert for zone violation
    
    Args:
        zone_name: Name of the zone (e.g., "High Danger Zone")
        language: Language code ("en", "hi", "mr")
    """
    text = get_alert_text("zone_alerts", zone_name, language)
    play_voice_alert(text, language)

def play_ppe_alert(violation_type, language="en"):
    """
    Play voice alert for PPE violation
    
    Args:
        violation_type: Type of violation (e.g., "No Helmet")
        language: Language code ("en", "hi", "mr")
    """
    text = get_alert_text("ppe_alerts", violation_type, language)
    play_voice_alert(text, language)

def get_available_languages():
    """Get list of available languages"""
    return VOICE_CONFIG["languages"]

# Test function
if __name__ == "__main__":
    print("Testing Voice Alerts...")
    print("\nAvailable Languages:", get_available_languages())
    
    print("\n1. Testing Zone Alert (English):")
    play_zone_alert("High Danger Zone", "en")
    time.sleep(3)
    
    print("\n2. Testing Zone Alert (Hindi):")
    play_zone_alert("Low Danger Zone", "hi")
    time.sleep(3)
    
    print("\n3. Testing Zone Alert (Marathi):")
    play_zone_alert("High Danger Zone", "mr")
    time.sleep(3)
    
    print("\n4. Testing PPE Alert (English):")
    play_ppe_alert("No Helmet", "en")
    time.sleep(3)
    
    print("\nTest complete!")
