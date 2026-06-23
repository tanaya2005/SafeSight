# 📋 SafeSight – MVP Plan (3–4 Hour Sprint)

> **Event:** WIET Hackverse 2.0
> **Team:** Stranger Strings
> **Target:** Working MVP demonstrating core SafeSight features

---

## ⏱️ Hour-by-Hour Breakdown

---

### Hour 1 – Project Setup & Infrastructure

**Goal:** Have a running skeleton with MongoDB connected and repo pushed to GitHub.

#### All Team Members (15 min)
- [ ] Clone repository
- [ ] Review project structure
- [ ] Assign local tasks

#### Backend Developer (45 min)
- [ ] `cd server && npm install`
- [ ] Copy `.env.example` to `.env` and configure `MONGO_URI`
- [ ] Run `node server.js` – verify MongoDB connects successfully
- [ ] Test `GET /api/workers` returns empty array (200 OK)
- [ ] Test `POST /api/auth/login` with test credentials

#### Frontend Developer (45 min)
- [ ] `cd client && npm install`
- [ ] Run `npm run dev` – verify React app starts
- [ ] Confirm Tailwind CSS classes are applying
- [ ] Open Login page and test UI

#### AI Engineer (45 min)
- [ ] `cd ai-engine && pip install -r requirements.txt`
- [ ] Verify YOLO model downloads (first run)
- [ ] Test `python detect_ppe_webcam.py` – should open webcam window
- [ ] Confirm bounding boxes appear on person/PPE items

#### Pitch Lead (45 min)
- [ ] Set up GitHub repository (if not done)
- [ ] `git push` initial code
- [ ] Begin architecture diagram in draw.io or Figma
- [ ] Find/prepare PPE dataset links for README

---

### Hour 2 – Core Feature: PPE Detection

**Goal:** PPE detection running on webcam, violation alerts sending to backend.

#### AI Engineer (60 min)
- [ ] Fine-tune detection classes: helmet, vest, boots, goggles
- [ ] Add logic: if worker without helmet → flag violation
- [ ] Implement `send_violation_alert()` function to POST to backend
- [ ] Test: cover/uncover head → violation triggers → API call succeeds
- [ ] (Optional) Serve a MJPEG stream endpoint for dashboard to display

#### Backend Developer (60 min)
- [ ] Create `POST /api/violations` endpoint
- [ ] Store violation in database or emit via Socket.IO
- [ ] Test Socket.IO connection from frontend
- [ ] Seed database with 3–4 sample workers (use a seed script)
- [ ] Test all attendance endpoints with Postman/Thunder Client

#### Frontend Developer (60 min)
- [ ] Connect Socket.IO client to backend
- [ ] Display real-time violation alerts in notification panel
- [ ] Style the Dashboard with dark theme
- [ ] Make camera grid responsive (2x2 layout stable)

#### Pitch Lead (60 min)
- [ ] Record early demo footage of PPE detection working
- [ ] Prepare slide 1–3 of presentation
- [ ] Draft problem statement and solution narrative

---

### Hour 3 – Dashboard & Multi-Camera View

**Goal:** Dashboard shows 4 camera feeds, workers table, and live alerts.

#### Frontend Developer (60 min)
- [ ] Implement `CameraGrid.jsx` with 4 video/img elements
- [ ] Connect webcam stream (navigator.mediaDevices or MJPEG URL)
- [ ] Build `WorkerTable.jsx` with sample data from API
- [ ] Build `RestrictedZoneTable.jsx`
- [ ] Add Navbar with supervisor name and logout button
- [ ] Implement login flow (token stored in localStorage)

#### Backend Developer (30 min)
- [ ] Create `GET /api/workers/inside` – returns workers currently on site
- [ ] Create `GET /api/zones/active` – returns active zone access records
- [ ] Ensure all endpoints return proper JSON
- [ ] Add error handling middleware

#### Backend Developer (30 min)
- [ ] Test complete attendance flow end-to-end
- [ ] Test zone access approval flow
- [ ] Document API in a quick reference (Postman collection or markdown table)

#### AI Engineer (60 min)
- [ ] Serve MJPEG frame stream: `http://localhost:8080/video_feed`
- [ ] Test multiple concurrent streams (simulate 4 cameras)
- [ ] Optimize frame processing to reduce CPU usage
- [ ] Add confidence threshold (>= 0.5 for alerts)

---

### Hour 4 – Worker Entry System & QR Scanning

**Goal:** Workers can be scanned in/out, and QR flow works end-to-end.

#### Frontend Developer (45 min)
- [ ] Implement `QRScanner.jsx` using `react-qr-reader` or HTML5 camera
- [ ] On scan → POST to `/api/attendance/entry` or `/api/attendance/exit`
- [ ] Show success/failure message after scan
- [ ] Display updated worker table after entry/exit

#### Backend Developer (30 min)
- [ ] Finalize `POST /api/attendance/entry` logic
- [ ] Finalize `POST /api/attendance/exit` logic
- [ ] Test with actual QR codes generated for sample workers

#### All Team Members (45 min)
- [ ] **Integration Testing** – run full demo flow:
  1. Log in as supervisor
  2. Worker scans QR → appears in Workers on Site table
  3. PPE violation detected → alert shows on dashboard
  4. Worker approaches restricted zone → supervisor sees alert → Approve/Reject
  5. Worker scans QR to exit → removed from table

#### Pitch Lead (60 min)
- [ ] Record final demo video
- [ ] Complete presentation slides
- [ ] Prepare live demo script
- [ ] Upload dataset links to README

---

## 🎯 MVP Success Criteria

| Feature | Priority | Status |
|---------|----------|--------|
| Supervisor login with JWT | P0 | ⬜ |
| PPE detection on webcam | P0 | ⬜ |
| 4-camera dashboard grid | P0 | ⬜ |
| Worker QR scan entry/exit | P0 | ⬜ |
| Workers on Site table | P0 | ⬜ |
| Real-time violation alerts | P1 | ⬜ |
| Restricted zone approval flow | P1 | ⬜ |
| Restricted Zone table | P1 | ⬜ |
| Multiple camera streams | P2 | ⬜ |
| Worker photo capture | P2 | ⬜ |

**P0** = Must have for demo
**P1** = Should have
**P2** = Nice to have

---

## 🚨 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| MongoDB connection refused | Ensure `mongod` is running locally OR use MongoDB Atlas URI |
| YOLO model not downloading | Check internet connection; manually download `yolov8n.pt` from Ultralytics |
| CORS error on frontend | Ensure backend has `cors` middleware with correct origin |
| Camera not detected by Python | Check `cv2.VideoCapture(0)` index; try 1 or 2 |
| QR scan not working | Ensure HTTPS or localhost (browser camera API requirement) |
| Socket.IO not connecting | Match client and server Socket.IO versions |

---

## 📦 Quick Commands Reference

```bash
# Backend
cd server && npm run dev

# Frontend  
cd client && npm run dev

# AI Engine
cd ai-engine && python detect_ppe_webcam.py

# Generate QR codes for workers (Python)
python -c "import qrcode; qrcode.make('WORKER_001').save('qr_worker_001.png')"

# Seed sample workers
node server/scripts/seed.js
```
