# 🦺 SafeSight – AI Powered Industrial Safety Monitoring System

> **WIET Hackverse 2.0 Hackathon Project** | Team: **Stranger Strings**  
> *Transforming Industrial Safety through Vision AI*

---

## 🚨 The Challenge
Industrial worksites often face safety risks due to PPE non-compliance, unauthorized entry into hazardous zones, and inefficient worker tracking. **SafeSight** leverages state-of-the-art Computer Vision and Real-time AI to automate safety monitoring, ensure compliance, and provide actionable analytics to supervisors.

---

## ✨ Key Features

### 1. 🪖 Smart PPE Detection
Real-time monitoring of Critical Safety Gear using YOLOv8:
- **Helmet & Safety Goggles**
- **Reflective Safety Vests**
- **Steel-Toed Safety Boots**
- **Automated Violation Logging**: Instant alerts sent to the dashboard with worker details.

### 2. 🔒 Multi-Zone Intrusion Monitoring
Advanced restricted zone management with severity-based alerts:
- **Multiple Concurrent Zones**: Support for "High Danger Zones" (Critical) and "Gas Leak/Hazardous Zones" (Warning).
- **Color-Coded Visualization**: Red for critical risks, Orange for warnings.
- **Smart Tracking**: Independent worker tracking per zone with cooldown periods to prevent alert fatigue.
- **Dynamic Legend**: Real-time status indicators on both the video feed and supervisor dashboard.

### 3. 📊 Advanced Safety Analytics
Data-driven insights for improved site safety:
- **Violation Trends**: 30-day historical trend analysis.
- **Distribution Charts**: Violations broken down by type, camera location, and time of day.
- **Top Violators Leaderboard**: Identify workers who frequently bypass safety protocols for targeted training.
- **Interactive Dashboard**: Modern UI with real-time updates and interactive charts (Recharts).

### 4. 🪪 Worker Management & Attendance
Streamlined tracking system:
- **QR Code Integration**: Fast and secure entry/exit logging.
- **Photo Verification**: Automated photo capture upon scanning.
- **Role-Based Access**: Assign worker roles and zone permissions directly from the interface.

---

## 🛠️ Tech Stack

- **AI Engine**: Python, OpenCV, YOLOv8, Flask (Video Streaming), `python-dotenv`
- **Frontend**: React.js, Tailwind CSS, Recharts (Analytics), Lucide React (Icons)
- **Backend**: Node.js, Express.js, JWT Authentication
- **Database**: MongoDB (via Mongoose ODM)
- **Design**: Modern Dark Mode UI with Glassmorphism and Responsive Layout

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.8+)
- MongoDB (Local or Atlas)
- Webcam or IP Camera (DroidCam supported)

### 1. Installation
```bash
# Clone the repository
git clone <your-repo-url>
cd SafeSight

# Install Backend Dependencies
cd server
npm install

# Install Frontend Dependencies
cd ../client
npm install

# Install AI Engine Dependencies
cd ../ai-engine
pip install -r requirements.txt
```

### 2. Configuration (`.env`)
Create a `.env` file in the root, `server/`, and `ai-engine/` directories.

**Root / Server `.env`**:
```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key_here
PORT=5000
```

**AI Engine `.env`**:
```env
CAM_PPE_INDEX=0       # Camera for PPE Detection
CAM_ZONE_INDEX=1      # Camera for Zone Monitoring
CAM_WEBCAM_INDEX=0    # Default fallback
```

### 3. Running the Project

**Start Backend:**
```bash
cd server
npm run dev
```

**Start Frontend:**
```bash
cd client
npm run dev
```

**Start AI Engine (PPE Monitoring):**
```bash
cd ai-engine
python camera_stream_server.py
```

**Start AI Engine (Zone Monitoring):**
```bash
cd ai-engine
python zone_stream_server.py
```

---

## 📁 Project Structure

```
SafeSight/
├── ai-engine/            # Python AI Service (PPE & Zone Detection)
│   ├── utils/            # Helper functions for processing
│   ├── .env              # Camera configuration
│   └── *_server.py       # Flask video streaming servers
├── client/               # React Frontend
│   ├── src/pages/        # Dashboard, Analytics, Zones, Attendance
│   └── src/components/   # Reusable UI elements
├── server/               # Node.js Backend
│   ├── models/           # MongoDB Schemas (Worker, Violation, Attendance)
│   ├── routes/           # API Endpoints
│   └── controllers/      # Business logic
└── docs/                 # Documentation & Architecture guides
```

---

## 🤝 Collaborators

Built with ❤️ by **Team Stranger Strings** for **WIET Hackverse 2.0**.

<table align="center">
  <tr>
    <td align="center">
      <a href="https://github.com/tanaya2005">
        <img src="https://avatars.githubusercontent.com/tanaya2005?v=4" width="100px;" alt="Tanaya Jain"/><br />
        <sub><b>Tanaya Jain</b></sub>
      </a><br />
      <sub>Frontend Architect &<br/>UI/UX Design</sub>
    </td>
    <td align="center">
      <a href="https://github.com/Kingslaye-varun">
        <img src="https://avatars.githubusercontent.com/Kingslaye-varun?v=4" width="100px;" alt="Varun Rahatgaonkar"/><br />
        <sub><b>Varun Rahatgaonkar</b></sub>
      </a><br />
      <sub>Backend Developer &<br/>Database Security</sub>
    </td>
    <td align="center">
      <a href="https://github.com/Atharvasp333">
        <img src="https://avatars.githubusercontent.com/Atharvasp333?v=4" width="100px"; alt="Atharva Pingale"/><br />
        <sub><b>Atharva Pingale</b></sub>
      </a><br />
      <sub>Vision AI &<br/>Real-time Processing</sub>
    </td>
    <td align="center">
      <a href="https://github.com/architchitte">
        <img src="https://avatars.githubusercontent.com/architchitte?v=4" width="100px;" alt="Archit Chitte"/><br />
        <sub><b>Archit Chitte</b></sub>
      </a><br />
      <sub>ML Ops &<br/>Dataset Engineering</sub>
    </td>
  </tr>
</table>

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

*Built with ❤️ for WIET Hackverse 2.0*
