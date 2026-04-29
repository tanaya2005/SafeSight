# Multi-Zone Restricted Area Implementation

## Overview
Enhanced the Safe-Sight restricted zone system to support multiple hazard zones with different severity levels and colors.

## Changes Made

### 1. Zone Definition Structure
**Files Modified:**
- `ai-engine/zone_stream_server.py`
- `ai-engine/advanced_safety_inspector.py`

**New Zone Format:**
```python
ZONE_DEFINITIONS = [
    {
        "polygon": np.array([[x1, y1], [x2, y2], ...], np.int32),
        "color": (B, G, R),  # BGR color tuple
        "name": "Zone Name",
        "severity": "critical" | "warning"
    }
]
```

**Predefined Zones:**
1. **High Danger Zone** (Red)
   - Location: Bottom-right corner (450,350 to 630,460)
   - Color: Red (0, 0, 255)
   - Severity: Critical
   
2. **Gas Leak Zone** (Orange)
   - Location: Top-left corner (50,100 to 200,250)
   - Color: Orange (0, 165, 255)
   - Severity: Warning

### 2. Detection Logic Updates

**Per-Zone Tracking:**
- Each worker is tracked independently for each zone
- Separate cooldown timers per worker per zone
- Workers can trigger alerts for multiple zones simultaneously

**Alert System:**
- Zone-specific violation messages
- Severity level included in alerts
- Format: `"{Zone Name} Entry - Severity: {CRITICAL/WARNING} - trackingID: {id}"`

**Visual Indicators:**
- Each zone drawn with its designated color
- Semi-transparent overlay (30% opacity)
- Zone labels displayed at polygon center
- Intruders highlighted with zone color
- Most severe zone color used when worker is in multiple zones

### 3. Dashboard Integration

**File Modified:** `client/src/pages/RestrictedZones.jsx`

**Zone Legend Added:**
- Visual color-coded legend showing all zone types
- Severity level descriptions
- Real-time monitoring status indicator

**Legend Display:**
- Red box: High Danger Zone (Critical Severity)
- Orange box: Gas Leak / Hot Chamber Zone (Warning Severity)
- Explanatory text for each zone type

### 4. Video Feed Enhancements

**On-Screen Legend:**
- Zone legend displayed on video feed
- Shows zone name, color, and severity
- Updates dynamically as zones are added/removed

**HUD Information:**
- Active zone count
- Zone names with severity levels
- Color-coded zone boundaries

## Usage

### Running Zone Monitoring
```bash
cd ai-engine
python zone_stream_server.py
```

### Running Advanced Inspector
```bash
cd ai-engine
python advanced_safety_inspector.py
```

### Adding New Zones
Edit the `ZONE_DEFINITIONS` list in either file:

```python
ZONE_DEFINITIONS.append({
    "polygon": np.array([[x1, y1], [x2, y2], [x3, y3], [x4, y4]], np.int32),
    "color": (B, G, R),  # BGR format
    "name": "New Zone Name",
    "severity": "critical"  # or "warning"
})
```

## Alert Behavior

### Entry Detection
- Alert triggered on first entry into zone
- Separate tracking for each zone
- Cooldown period: 18 seconds per zone per worker

### Multi-Zone Intrusion
- Worker can be in multiple zones simultaneously
- Separate alerts sent for each zone
- Visual indicator uses most severe zone color

### Exit Detection
- Worker removed from tracking when leaving zone
- Can re-enter and trigger new alert after cooldown

## Color Scheme

| Zone Type | Color (BGR) | Hex | Severity |
|-----------|-------------|-----|----------|
| High Danger | (0, 0, 255) | #FF0000 | Critical |
| Gas Leak | (0, 165, 255) | #FFA500 | Warning |
| Cone Safety | (0, 255, 255) | #FFFF00 | Dynamic |
| User-Defined | (255, 0, 255) | #FF00FF | Custom |

## Architecture Benefits

1. **Scalable:** Easy to add new zones with different properties
2. **Flexible:** Each zone has independent tracking and alerting
3. **Visual Clarity:** Color-coded zones prevent confusion
4. **Severity-Based:** Critical zones can be prioritized in alerts
5. **Backward Compatible:** Existing zone logic preserved

## Testing

1. Start the zone monitoring server
2. Position yourself in different zones
3. Verify alerts are triggered with correct zone names
4. Check dashboard displays zone legend correctly
5. Confirm cooldown works independently per zone

## Future Enhancements

- Database-driven zone configuration
- Dynamic zone creation via UI
- Zone-specific access control
- Historical zone violation analytics
- Mobile notifications for critical zones
