# 📊 Safety Analytics Feature

## Overview

The Safety Analytics dashboard provides comprehensive visual insights into safety violations over the past 30 days, helping supervisors identify trends, patterns, and areas requiring attention.

---

## Features Implemented

### 1. Summary Statistics Cards

Four key metrics displayed at the top:

- **Total Violations**: All violations in the last 30 days
- **This Week**: Current week violations with percentage change from last week
- **PPE Violations**: Equipment-related violations (excluding zone violations)
- **Unique Violators**: Number of distinct workers involved in violations

### 2. Violations Trend Chart (Line Chart)

- Shows daily violation counts over the last 30 days
- Helps identify patterns and trends over time
- Missing dates are filled with zero violations for continuity
- Interactive tooltips show exact counts

### 3. Violations by Type (Bar Chart)

- Breaks down violations by category:
  - No Helmet
  - No Vest
  - No Goggles
  - No Boots
  - Restricted Zone Entry
- Helps identify which PPE items are most frequently missing

### 4. Violations by Camera (Pie Chart)

- Shows distribution of violations across different cameras
- Helps identify high-risk zones or areas needing more attention
- Percentage breakdown for each camera

### 5. Violations by Hour (Bar Chart)

- Shows when violations occur most frequently throughout the day
- Helps identify peak violation times
- Useful for scheduling additional supervision during high-risk hours

### 6. Top Violators Table

- Lists up to 10 workers with the most violations
- Shows:
  - Rank (with special styling for top 3)
  - Worker ID
  - Name
  - Role
  - Total violation count
  - Date of last violation
- Color-coded violation counts:
  - Red: 10+ violations
  - Orange: 5-9 violations
  - Yellow: 1-4 violations

---

## Technical Implementation

### Backend API

**Endpoint**: `GET /api/analytics/violations`

**Authentication**: Requires JWT token (protected route)

**Response Structure**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalViolations": 45,
      "thisWeek": 12,
      "weekChange": 15.5,
      "ppeViolations": 38,
      "uniqueViolators": 8
    },
    "violationsByType": [...],
    "topViolators": [...],
    "violationsOverTime": [...],
    "violationsByCamera": [...],
    "violationsByTimeOfDay": [...]
  }
}
```

### Frontend Components

**Location**: `client/src/pages/Analytics.jsx`

**Dependencies**:
- `recharts`: Chart library for React
- `lucide-react`: Icon library
- `react-hot-toast`: Toast notifications

**Key Features**:
- Responsive grid layout
- Loading states
- Error handling
- Custom tooltips for charts
- Animated transitions

---

## Navigation

The Analytics page is accessible from:
- **Sidebar**: Second item in the navigation menu
- **Route**: `/analytics`
- **Icon**: Bar chart icon

---

## Data Flow

```
AI Engine → Violation Detection
     ↓
Backend API → Store in MongoDB (Violation model)
     ↓
Analytics Controller → Aggregate and analyze data
     ↓
Frontend → Fetch and visualize
```

---

## Usage

### For Supervisors

1. **Monitor Trends**: Check the line chart to see if violations are increasing or decreasing
2. **Identify Problem Areas**: Use the camera pie chart to find high-risk zones
3. **Target Training**: Review top violators and violation types to focus safety training
4. **Schedule Supervision**: Use hourly breakdown to schedule supervisors during peak violation times

### For Administrators

1. **Generate Reports**: Use the data to create monthly safety reports
2. **Set Goals**: Track week-over-week changes to measure improvement
3. **Resource Allocation**: Identify cameras/zones needing additional resources
4. **Worker Counseling**: Use top violators list for targeted safety counseling

---

## Future Enhancements

Potential improvements for future versions:

- [ ] Export analytics data to PDF/Excel
- [ ] Custom date range selection
- [ ] Comparison between different time periods
- [ ] Real-time analytics updates via WebSocket
- [ ] Violation severity scoring
- [ ] Predictive analytics using ML
- [ ] Department-wise breakdown
- [ ] Shift-wise analysis
- [ ] Weather correlation analysis
- [ ] Cost impact calculations

---

## Testing

### With Real Data

If you have violations in the database:
1. Navigate to `/analytics`
2. Charts will populate with actual data
3. Interact with charts (hover for tooltips)

### With Mock Data

If no violations exist:
1. The backend will return empty arrays
2. Frontend will show "No violation data available" message
3. To test with data, create violations via:
   - AI Engine detection
   - Manual POST to `/api/violations`

---

## Troubleshooting

### Charts Not Displaying

- Check browser console for errors
- Verify recharts is installed: `npm list recharts`
- Ensure backend API is running
- Check JWT token is valid

### No Data Showing

- Verify violations exist in database
- Check date range (last 30 days)
- Ensure MongoDB connection is active
- Check API response in Network tab

### Performance Issues

- Large datasets may slow rendering
- Consider pagination for top violators
- Implement data caching
- Use React.memo for chart components

---

## API Integration

### Example API Call

```javascript
import { getViolationAnalytics } from '../services/api';

const fetchData = async () => {
  try {
    const response = await getViolationAnalytics();
    console.log(response.data.data);
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
  }
};
```

### Example Response

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalViolations": 45,
      "thisWeek": 12,
      "weekChange": 15.5,
      "ppeViolations": 38,
      "uniqueViolators": 8
    },
    "violationsByType": [
      { "type": "No Helmet", "count": 20 },
      { "type": "No Vest", "count": 15 }
    ],
    "topViolators": [
      {
        "workerId": "WRK-12345",
        "name": "John Doe",
        "role": "Technician",
        "count": 8,
        "lastViolation": "2026-03-10T10:30:00Z"
      }
    ]
  }
}
```

---

## Styling

The Analytics page follows the SafeSight design system:

- **Dark Theme**: Consistent with dashboard
- **Color Palette**:
  - Primary: Blue (#3b82f6)
  - Danger: Red (#ef4444)
  - Warning: Orange/Yellow
  - Success: Green
- **Typography**: Inter font family
- **Spacing**: Consistent with Tailwind spacing scale
- **Animations**: Fade-in effects for smooth loading

---

Built with ❤️ by Team Stranger Strings
