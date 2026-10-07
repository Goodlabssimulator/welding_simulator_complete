/**
 * Intelligent Welding Training Simulator - Main Server Entry Point
 * 
 * Sets up Express server, middleware, routes, WebSocket support,
 * and database connection pool.
 */

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { WebSocketServer } = require('ws');

const config = require('../config/env');
const authRoutes = require('./routes/auth');
const weldingRoutes = require('./routes/welding');
const assessmentRoutes = require('./routes/assessment');
const analyticsRoutes = require('./routes/analytics');
const tutorRoutes = require('./routes/tutor');
const { authenticate } = require('./middleware/authMiddleware');
const { errorHandler } = require('./middleware/errorHandler');
const { pool } = require('./utils/database');

const app = express();
const server = http.createServer(app);

// =============================================================
// SECURITY & MIDDLEWARE
// =============================================================

app.use(helmet());
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// =============================================================
// API ROUTES
// =============================================================

app.use('/api/auth', authRoutes);
app.use('/api/welding', authenticate, weldingRoutes);
app.use('/api/assessment', authenticate, assessmentRoutes);
app.use('/api/analytics', authenticate, analyticsRoutes);
app.use('/api/tutor', authenticate, tutorRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling (must be last middleware)
app.use(errorHandler);

// =============================================================
// WEBSOCKET SERVER
// =============================================================

const wss = new WebSocketServer({ server, path: '/ws' });

// Store active connections
const activeConnections = new Map();

wss.on('connection', (ws, req) => {
  console.log('WebSocket client connected');
  
  let userId = null;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'auth':
          // Authenticate WebSocket connection
          userId = message.userId;
          activeConnections.set(userId, ws);
          ws.send(JSON.stringify({ type: 'auth_confirmed' }));
          break;
          
        case 'welding:telemetry':
          // Process real-time welding telemetry
          handleTelemetry(userId, message.data);
          break;
          
        case 'welding:start':
          // Session start
          ws.send(JSON.stringify({ 
            type: 'welding:started', 
            sessionId: message.sessionId 
          }));
          break;
          
        case 'welding:stop':
          // Session stop
          ws.send(JSON.stringify({ 
            type: 'welding:stopped', 
            sessionId: message.sessionId 
          }));
          break;
          
        default:
          ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
      }
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  ws.on('close', () => {
    if (userId) activeConnections.delete(userId);
    console.log('WebSocket client disconnected');
  });
});

/**
 * Handle incoming welding telemetry data
 * Provides real-time feedback when anomalies are detected
 */
async function handleTelemetry(userId, telemetry) {
  // Buffer telemetry for batch insert
  // In production, use a message queue for scalability
  
  const { sessionId, readings } = telemetry;
  
  // Analyze for real-time alerts
  for (const reading of readings) {
    const alerts = [];
    
    // Speed alert
    if (reading.speed > 8.0) {
      alerts.push({
        type: 'welding:alert',
        level: 'warning',
        message: 'Travel speed too high - risk of lack of penetration',
      });
    } else if (reading.speed < 2.0) {
      alerts.push({
        type: 'welding:alert',
        level: 'warning',
        message: 'Travel speed too low - risk of excessive reinforcement',
      });
    }
    
    // Path deviation alert
    if (reading.pathDeviation > 5.0) {
      alerts.push({
        type: 'welding:alert',
        level: 'danger',
        message: 'Excessive path deviation - risk of lack of fusion',
      });
    }
    
    // Send alerts to the connected client
    const ws = activeConnections.get(userId);
    if (ws && ws.readyState === 1) {
      for (const alert of alerts) {
        ws.send(JSON.stringify(alert));
      }
      // Send periodic performance feedback
      if (reading.timestamp_ms % 2000 < 50) {
        ws.send(JSON.stringify({
          type: 'welding:feedback',
          data: {
            currentSpeed: reading.speed,
            deviation: reading.pathDeviation,
            status: reading.speed > 6 ? 'too_fast' : reading.speed < 2.5 ? 'too_slow' : 'optimal',
          },
        }));
      }
    }
  }
}

// =============================================================
// START SERVER
// =============================================================

const PORT = config.PORT;

server.listen(PORT, () => {
  console.log(`\n🔥 Welding Simulator API running on port ${PORT}`);
  console.log(`📡 WebSocket server ready at ws://localhost:${PORT}/ws`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${config.NODE_ENV}\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    pool.end();
    process.exit(0);
  });
});

module.exports = { app, server };
