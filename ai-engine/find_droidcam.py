"""
Find DroidCam camera index
"""
import cv2

print("=" * 60)
print("  Finding DroidCam Camera Index")
print("=" * 60)
print("\nScanning all camera indices (0-10)...\n")

droidcam_found = False

for i in range(11):
    try:
        cap = cv2.VideoCapture(i, cv2.CAP_DSHOW)
        if cap.isOpened():
            ret, frame = cap.read()
            if ret and frame is not None:
                h, w = frame.shape[:2]
                backend = cap.getBackendName()
                print(f"✓ Camera {i}: AVAILABLE")
                print(f"  Resolution: {w}x{h}")
                print(f"  Backend: {backend}")
                
                # Try to get camera name (Windows specific)
                try:
                    import subprocess
                    result = subprocess.run(['powershell', '-Command', 
                                           f'Get-PnpDevice -Class Camera | Select-Object -Property FriendlyName'],
                                          capture_output=True, text=True, timeout=2)
                    if 'DroidCam' in result.stdout:
                        print(f"  *** THIS IS DROIDCAM! ***")
                        droidcam_found = True
                except:
                    pass
                
                print()
            cap.release()
        else:
            print(f"✗ Camera {i}: Not available")
    except Exception as e:
        print(f"✗ Camera {i}: Error - {e}")

print("=" * 60)

if droidcam_found:
    print("\n✅ DroidCam found! Check the index marked above.")
else:
    print("\n⚠️  Could not automatically detect DroidCam name.")
    print("   But you can see which cameras are available above.")
    print("\n   Try each available camera index in zone_stream_server.py")
    print("   One of them should be DroidCam!")

print("\n" + "=" * 60)
