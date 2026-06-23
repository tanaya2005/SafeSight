require('dotenv').config();
const express = require('express');
const http    = require('http');
const path    = require('path');
const { Server } = require('socket.io');
const cors    = require('cors');
const connectDB = require('./config/db');

// ── Route Imports ─────────────────────────────────────────────────────────────
const workerRoutes     = require('./routes/workerRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const zoneRoutes       = require('./routes/zoneRoutes');
const violationRoutes  = require('./routes/violationRoutes');
const ppeConfigRoutes  = require('./routes/ppeConfigRoutes');
const workerPPELogRoutes = require('./routes/workerPPELogRoutes');
const analyticsRoutes  = require('./routes/analyticsRoutes');

// Try to load dashboard routes (non-fatal if missing)
let dashboardRoutes;
try {
  dashboardRoutes = require('./routes/dashboardRoutes');
} catch (_) {
  dashboardRoutes = null;
}

// ── Database ──────────────────────────────────────────────────────────────────
connectDB().catch((err) => {
  console.warn(`⚠️  MongoDB unavailable: ${err.message}`);
  console.warn('   Server running in degraded mode (no DB persistence)\n');
});

const app    = express();
const server = http.createServer(app);

// ── Socket.IO ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  },
});

// Make io accessible inside route/controller handlers via req.app.get('io')
app.set('io', io);

// ── Core Middleware ────────────────────────────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static uploads (QR images etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    message: '🦺 SafeSight API is running',
    version: '1.0.0',
    status: 'OK',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth:       'POST /api/auth/login',
      workers:    '/api/workers',
      attendance: '/api/attendance',
      zones:      '/api/zones',
      violations: '/api/violations',
      dashboard:  'GET /api/dashboard/stats',
    },
  });
});

// ── JWT Auth ──────────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  let { username, password } = req.body;
  username = username?.trim();
  password = password?.trim();
  const jwt = require('jsonwebtoken');

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  const validUsers = {
    'supervisor': { role: 'supervisor', id: 'supervisor_001' },
    'admin1': { role: 'admin_cctv', id: 'admin_001' },
    'admin2': { role: 'admin_qr', id: 'admin_002' },
  };

  if (validUsers[username] && password === 'safesight123') {
    const userRole = validUsers[username].role;
    const token = jwt.sign(
      { id: validUsers[username].id, username, role: userRole },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );
    return res.json({ success: true, token, username, role: userRole, expiresIn: '24h' });
  }

  return res.status(401).json({ success: false, message: 'Invalid credentials' });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/workers',     workerRoutes);
app.use('/api/attendance',  attendanceRoutes);
app.use('/api/zones',       zoneRoutes);
app.use('/api/violations',  violationRoutes);   // AI Engine → POST, Dashboard → GET
app.use('/api/ppe-config',  ppeConfigRoutes);   // PPE Configuration Management
app.use('/api/worker-ppe-log', workerPPELogRoutes);  // Worker PPE Compliance Tracking
app.use('/api/analytics',   analyticsRoutes);   // Analytics and Reporting
if (dashboardRoutes) {
  app.use('/api/dashboard', dashboardRoutes);
}

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// ── Socket.IO Events ─────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('zone_decision', (data) => {
    io.emit('zone_decision_result', data);
    console.log(`🏭 Zone decision via socket: ${JSON.stringify(data)}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║      🦺 SafeSight Backend Server          ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log(`\n🚀 Server  : http://localhost:${PORT}`);
  console.log(`📡 API Base: http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket (Socket.IO) ready`);
  console.log('\n── Quick Reference ───────────────────────────');
  console.log(`🔐 Auth     : POST /api/auth/login`);
  console.log(`             { username: "supervisor", password: "safesight123" }`);
  console.log(`👷 Workers  : POST /api/workers/add  |  GET /api/workers/all`);
  console.log(`📋 Attend.  : POST /api/attendance/entry  |  POST /api/attendance/exit`);
  console.log(`🏭 Zones    : POST /api/zones/entry  |  GET /api/zones/current`);
  console.log(`⚠️  Violations: POST /api/violations (AI Engine)`);
  console.log(`📈 Dashboard: GET /api/dashboard/stats`);
  console.log('──────────────────────────────────────────────\n');
});

module.exports = { app, io };
