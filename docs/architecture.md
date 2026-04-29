# 🏗️ SafeSight – System Architecture

## Overview

SafeSight is a three-tier application consisting of:
1. **AI Engine** – Python-based real-time PPE detection
2. **Backend** – Node.js/Express REST API + WebSocket server
3. **Frontend** – React dashboard for supervisors

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        INDUSTRIAL SITE                          │
│                                                                 │
│  [Worker] ──QR Scan──▶ [Entry Terminal]                        │
│                              │                                  │
│  [Webcam/Camera] ──────▶ [AI Engine (Python/YOLO)]             │
│                              │                                  │
│                    ┌─────────▼──────────┐                      │
│                    │  PPE Detection      │                      │
│                    │  - Helmet ✅/❌     │                      │
│                    │  - Boots ✅/❌      │                      │
│                    │  - Vest ✅/❌       │                      │
│                    │  - Goggles ✅/❌    │                      │
│                    └─────────┬──────────┘                      │
└──────────────────────────────┼──────────────────────────────────┘
                               │ HTTP POST /api/violations
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js + Express)                   │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │ /api/workers│  │/api/attendance│  │   /api/zones        │   │
│  └─────────────┘  └──────────────┘  └─────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              WebSocket Server (ws://)                    │   │
│  │         Real-time alerts → Dashboard                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────┐                                   │
│  │     MongoDB / Mongoose   │                                   │
│  │  - Workers               │                                   │
│  │  - Attendance            │                                   │
│  │  - ZoneAccess            │                                   │
│  └─────────────────────────┘                                   │
└──────────────────────────────┬──────────────────────────────────┘
                               │ REST API + WebSocket
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FRONTEND (React + Tailwind)                    │
│                                                                 │
│  ┌──────────┬──────────┐    ┌─────────────────────────────┐   │
│  │  CAM 1   │  CAM 2   │    │     Workers on Site Table    │   │
│  ├──────────┼──────────┤    ├─────────────────────────────┤   │
│  │  CAM 3   │  CAM 4   │    │   Restricted Zone Table     │   │
│  └──────────┴──────────┘    └─────────────────────────────┘   │
│                                                                 │
│  🔔 Real-time Alerts Panel                                     │
│  "Akhil entering Welding Zone — PPE OK — Approve?"             │
│  [ Approve ] [ Reject ]                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Details

### AI Engine
- **Language:** Python 3.8+
- **Libraries:** OpenCV, Ultralytics YOLOv8, requests
- **Function:** Reads webcam frames, runs object detection, sends POST request to backend API when violations are detected
- **Model:** YOLOv8 pretrained + fine-tuned on PPE dataset

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Auth:** JWT (JSON Web Tokens)
- **Real-time:** Socket.IO for WebSocket communication
- **Database:** MongoDB with Mongoose ODM

### Frontend
- **Framework:** React 18 (Vite)
- **Styling:** Tailwind CSS
- **Routing:** React Router v6
- **State:** useState / useContext
- **Real-time:** Socket.IO client

---

## Data Flow

### Worker Entry
```
1. Worker presents QR code to scanner
2. Frontend sends POST /api/attendance/entry { qrCode }
3. Backend looks up worker by QR code
4. Backend creates Attendance record with entryTime = now
5. Backend marks worker.isInside = true
6. Response sent to frontend, table updates live
```

### PPE Violation Alert
```
1. AI Engine detects PPE violation in camera frame
2. POST /api/violations { cameraId, violationType, confidence, frame }
3. Backend emits WebSocket event 'ppe_violation' to all connected dashboards
4. Dashboard shows real-time alert notification
```

### Restricted Zone Access
```
1. Worker scans QR at restricted zone terminal
2. POST /api/zones/request { workerId, zoneName }
3. Backend checks worker.isInside = true and PPE status
4. If PPE valid → WebSocket 'zone_request' event to supervisor dashboard
5. Supervisor clicks Approve/Reject
6. POST /api/zones/approve { requestId, approved: true/false }
7. Backend creates ZoneAccess record, notifies terminal
```

---

## Security

- All `/api` routes (except login) require `Authorization: Bearer <JWT>` header
- JWT expires in 24 hours
- Passwords hashed with bcryptjs
- CORS configured for frontend domain only

---

## Database Schema

### `workers` Collection
```json
{
  "_id": "ObjectId",
  "name": "String",
  "role": "String",
  "qrCode": "String (unique)",
  "photo": "String (URL)",
  "isInside": "Boolean",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### `attendances` Collection
```json
{
  "_id": "ObjectId",
  "workerId": "ObjectId (ref: Worker)",
  "entryTime": "Date",
  "exitTime": "Date (nullable)",
  "createdAt": "Date"
}
```

### `zoneaccesses` Collection
```json
{
  "_id": "ObjectId",
  "workerId": "ObjectId (ref: Worker)",
  "zoneName": "String",
  "entryTime": "Date",
  "approvedBySupervisor": "Boolean",
  "status": "String (pending/approved/rejected)",
  "createdAt": "Date"
}
```
