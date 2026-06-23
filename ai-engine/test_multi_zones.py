"""
Test script to visualize multi-zone configuration
Shows zone placement and colors without requiring camera
"""

import cv2
import numpy as np

# Zone definitions (same as in zone_stream_server.py)
ZONE_DEFINITIONS = [
    {
        "polygon": np.array([[450, 350], [620, 320], [630, 460], [420, 470]], np.int32),
        "color": (0, 0, 255),  # Red (BGR)
        "name": "High Danger Zone",
        "severity": "critical"
    },
    {
        "polygon": np.array([[50, 100], [200, 100], [200, 250], [50, 250]], np.int32),
        "color": (0, 165, 255),  # Orange (BGR)
        "name": "Low Danger Zone",
        "severity": "warning"
    }
]

def visualize_zones():
    """Create a visualization of all zones"""
    # Create blank frame (640x480)
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    frame[:] = (40, 40, 40)  # Dark gray background
    
    # Draw each zone
    for zone_def in ZONE_DEFINITIONS:
        zone_poly = zone_def["polygon"]
        zone_color = zone_def["color"]
        zone_name = zone_def["name"]
        severity = zone_def["severity"]
        
        # Draw zone outline
        cv2.polylines(frame, [zone_poly], True, zone_color, 3)
        
        # Add semi-transparent fill
        overlay = frame.copy()
        cv2.fillPoly(overlay, [zone_poly], zone_color)
        cv2.addWeighted(overlay, 0.3, frame, 0.7, 0, frame)
        
        # Add zone label at center
        M = cv2.moments(zone_poly)
        if M["m00"] != 0:
            cx = int(M["m10"] / M["m00"])
            cy = int(M["m01"] / M["m00"])
            
            # Zone name
            cv2.putText(frame, zone_name, (cx - 70, cy - 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            
            # Severity
            cv2.putText(frame, f"({severity.upper()})", (cx - 50, cy + 15), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.4, zone_color, 1)
    
    # Add title
    cv2.putText(frame, "Multi-Zone Configuration Test", (10, 30), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
    
    # Add legend
    legend_y = 60
    cv2.putText(frame, "Zone Legend:", (10, legend_y), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    
    for zone_def in ZONE_DEFINITIONS:
        legend_y += 30
        # Draw color box
        cv2.rectangle(frame, (10, legend_y - 20), (35, legend_y - 5), zone_def["color"], -1)
        cv2.rectangle(frame, (10, legend_y - 20), (35, legend_y - 5), (255, 255, 255), 1)
        
        # Draw zone info
        text = f"{zone_def['name']} - {zone_def['severity'].upper()}"
        cv2.putText(frame, text, (40, legend_y - 8), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
    
    # Add instructions
    cv2.putText(frame, "Press 'q' to quit, 's' to save image", (10, 470), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 200, 200), 1)
    
    return frame

if __name__ == "__main__":
    print("=" * 60)
    print("  Multi-Zone Configuration Visualizer")
    print("=" * 60)
    print(f"  Total Zones: {len(ZONE_DEFINITIONS)}")
    print()
    
    for i, zone in enumerate(ZONE_DEFINITIONS, 1):
        print(f"  Zone {i}: {zone['name']}")
        print(f"    - Color: {zone['color']} (BGR)")
        print(f"    - Severity: {zone['severity'].upper()}")
        print(f"    - Polygon: {len(zone['polygon'])} points")
        print()
    
    print("=" * 60)
    print("  Generating visualization...")
    print("=" * 60)
    
    frame = visualize_zones()
    
    cv2.namedWindow("Multi-Zone Test", cv2.WINDOW_NORMAL)
    cv2.resizeWindow("Multi-Zone Test", 640, 480)
    
    print("\n✅ Visualization ready!")
    print("   Press 'q' to quit")
    print("   Press 's' to save image\n")
    
    while True:
        cv2.imshow("Multi-Zone Test", frame)
        key = cv2.waitKey(1) & 0xFF
        
        if key == ord('q'):
            break
        elif key == ord('s'):
            filename = "zone_configuration.png"
            cv2.imwrite(filename, frame)
            print(f"✅ Saved as {filename}")
    
    cv2.destroyAllWindows()
    print("\n👋 Test complete!")
