# 🦺 SafeSight – AI Powered Industrial Safety Monitoring System

> **Hackathon Project** | WIET Hackverse 2.0 | Team: Stranger Strings

---

## 🚨 Problem Statement

Industrial worksites frequently suffer accidents due to failure in PPE compliance, unauthorized zone access, and lack of real-time worker monitoring. SafeSight addresses this using computer vision and AI to:

- **Detect PPE compliance** (helmet, boots, vest, goggles)
- **Manage worker attendance** via QR code scanning
- **Monitor restricted zones** and alert supervisors in real time

---

## 👥 Team Members & Roles

| Member | Role | Responsibilities |
|--------|------|-----------------|
| Tanaya | **Product & Pitch Lead** | Prepare presentation, train models, collect PPE datasets |
| Varun | **Backend Developer** | Build API, connect MongoDB, manage authentication |
| Atharva | **AI Engineer** | Integrate PPE detection and run real-time monitoring |
| Archit |**Frontend Developer** | Build dashboard UI and camera grid interface  |

---

## 🛠️ Tech Stack

### Frontend
- ⚛️ **React** – UI framework
- 🎨 **Tailwind CSS** – Utility-first styling
- 🌐 **React Router** – Client-side routing
- 📊 **Recharts** – Dashboard charts and visualization
- 🧭 **Lucide React** – Icon set
- 🔔 **React Hot Toast** – Toast notifications
- 🔍 **react-qr-reader** / **html5-qrcode** – QR scanner support
- 🎮 **three.js** – 3D graphics and scene rendering

### Backend
- 🟢 **Node.js** – Runtime
- 🚂 **Express.js** – REST API framework

### Database
- 🍃 **MongoDB** – NoSQL database (via Mongoose ODM)

### AI Engine
- 🐍 **Python** – Core language
- 👁️ **OpenCV** – Computer vision
- 🎯 **YOLOv8** – Object detection model

### Auth
- 🔐 **JWT** – JSON Web Tokens for supervisor login

---

## ✨ Features

### 1. 🪖 PPE Detection System
Real-time detection of personal protective equipment using YOLOv8:

| PPE Item | Detection |
|----------|-----------|
| Helmet | ✅ |
| Safety Boots | ✅ |
| Safety Vest | ✅ |
| Safety Goggles | ✅ |

- **Input:** Webcam / IP camera stream
- **Output:** Bounding boxes + violation alerts sent to dashboard

---

### 2. 📷 Multi-Camera Dashboard
For MVP, 4 laptops act as 4 camera feeds.

```
┌──────────┬──────────┐
│  CAM 1   │  CAM 2   │
├──────────┼──────────┤
│  CAM 3   │  CAM 4   │
└──────────┴──────────┘
```

Each feed runs PPE detection independently and streams results to the central dashboard.

---

### 3. 🪪 Worker Entry / Exit System
Each worker is assigned:
- Unique **ID**
- **Name** and **Role**
- **QR Code** for scanning

**Entry Flow:**
1. Worker scans QR code
2. Camera captures photo
3. System saves entry timestamp

**Exit Flow:**
1. Worker scans QR code
2. System saves exit timestamp

---

### 4. 🔒 Restricted Zone Control
Restricted zones require supervisor authorization:

```
Worker scans QR
       ↓
Camera checks PPE compliance
       ↓
If PPE valid → Alert sent to supervisor
"Akhil has entered Welding Zone. Approve access?"
       ↓
Supervisor: [Approve] or [Reject]
```

---

### 5. 📊 Dashboard Tables

**Workers on Site**
| Worker | Role | Entry Time | Photo |
|--------|------|------------|-------|

**Restricted Zone Workers**
| Worker | Zone | Entry Time | Status |
|--------|------|------------|--------|

Supervisors can assign worker roles and zone permissions from the dashboard.

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- MongoDB (local or Atlas)
- Python >= 3.8
- pip

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd SafeSight
```

### 2. Setup Environment Variables
```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Start the Backend
```bash
cd server
npm install
npm run dev
```

### 4. Start the Frontend
```bash
cd client
npm install
npm run dev
```

### 5. Run the AI Engine
```bash
cd ai-engine
pip install -r requirements.txt
python detect_ppe_webcam.py
```

---

## 🔑 Environment Variables

```env
MONGO_URI=mongodb://localhost:27017/safesight
JWT_SECRET=your_super_secret_jwt_key
PORT=5000
```

---

## 🗂️ Project Structure

```
SafeSight/
├── client/               # React frontend
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── pages/        # Route pages
│       └── services/     # API service layer
├── server/               # Express backend
│   ├── config/           # DB connection
│   ├── models/           # MongoDB schemas
│   ├── routes/           # API routes
│   └── controllers/      # Business logic
├── ai-engine/            # Python PPE detection
└── docs/                 # Architecture & planning docs
```

---

## 📅 MVP Plan (3–4 Hours)

| Hour | Tasks |
|------|-------|
| **Hour 1** | Create repo, project structure, push to GitHub, setup MongoDB |
| **Hour 2** | Run PPE detection on webcam |
| **Hour 3** | Create dashboard with 4 camera feeds |
| **Hour 4** | Implement worker entry system with QR scanning |

---

## 📋 Team Task Distribution

### 🖥️ Frontend Developer
- [ ] Build dashboard layout
- [ ] Implement 4-camera grid
- [ ] Build worker attendance tables
- [ ] Implement QR scanner UI
- [ ] Build restricted zone table

### ⚙️ Backend Developer
- [ ] Create REST APIs (workers, attendance, zones)
- [ ] Connect MongoDB with Mongoose
- [ ] Implement JWT authentication
- [ ] Create supervisor notification endpoint
- [ ] Build WebSocket for real-time alerts

### 🤖 AI Engineer
- [ ] Run YOLOv8 PPE detection on webcam
- [ ] Integrate webcam stream processing
- [ ] Build Flask/FastAPI endpoint for violation alerts
- [ ] Test detection accuracy

### 🎤 Pitch Lead
- [ ] Prepare demo video
- [ ] Train improved PPE detection model
- [ ] Prepare architecture diagrams
- [ ] Create presentation slides

---

## 🔗 Deployment Links

| Service | URL |
|---------|-----|
| **Frontend** | *(To be added)* |
| **Backend** | *(To be added)* |
| **Dataset** | *(To be added)* |

---

## 📄 License

MIT License – Built for WIET Hackverse 2.0

---

*Built with ❤️ by Team Stranger Strings*
