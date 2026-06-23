"""
Quick test to verify .env configuration is loaded correctly
"""
import os
from dotenv import load_dotenv

print("=" * 60)
print("  Camera Configuration Test")
print("=" * 60)

# Load .env file
load_dotenv()

# Read camera indices
cam_ppe = os.getenv('CAM_PPE_INDEX', 'NOT SET')
cam_zone = os.getenv('CAM_ZONE_INDEX', 'NOT SET')
cam_webcam = os.getenv('CAM_WEBCAM_INDEX', 'NOT SET')

print("\n📋 Current Configuration:")
print(f"  CAM_PPE_INDEX    = {cam_ppe}")
print(f"  CAM_ZONE_INDEX   = {cam_zone}")
print(f"  CAM_WEBCAM_INDEX = {cam_webcam}")

# Convert to integers
try:
    cam_ppe_int = int(cam_ppe)
    cam_zone_int = int(cam_zone)
    cam_webcam_int = int(cam_webcam)
    
    print("\n✅ Configuration Valid!")
    print(f"  PPE Detection will use camera {cam_ppe_int}")
    print(f"  Zone Monitoring will use camera {cam_zone_int}")
    print(f"  Testing scripts will use camera {cam_webcam_int}")
    
except ValueError:
    print("\n❌ Configuration Error!")
    print("  Please check your .env file and ensure all values are numbers.")
    print("\n  Example .env file:")
    print("  CAM_PPE_INDEX=1")
    print("  CAM_ZONE_INDEX=2")
    print("  CAM_WEBCAM_INDEX=0")

print("\n" + "=" * 60)
print("  To change configuration, edit: ai-engine/.env")
print("=" * 60)
