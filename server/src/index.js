/**
 * index.js — TERRITORIA Server Entry Point
 *
 * Wires together:
 *  - Express REST API (/api/grid, /api/health)
 *  - Socket.io real-time event handling
 *  - Rate limiting, CORS, session + grid management
 */

import 'dotenv/config';
import { createServer } from 'http';
import express from 'express';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

import { logger } from './logger.js';
import { GridManager } from './gridManager.js';
import { SessionManager } from './sessionManager.js';
import { computeLeaderboard } from './leaderboard.js';
import { usingRedis } from './redis.js';
import { MAX_USERNAME_LEN, ACTIVITY_FEED_SIZE } from './constants.js';

// ─── Config ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ─── App Setup ─────────────────────────────────────────────────────────────────
const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Prefer WebSocket, fall back to long-polling
  transports: ['websocket', 'polling'],
});

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

// Rate limit REST API to 100 req/15min per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});
app.use('/api', apiLimiter);

// ─── Managers ──────────────────────────────────────────────────────────────────
const gridManager = new GridManager();
const sessionManager = new SessionManager();

// In-memory activity feed (last N events)
const activityFeed = [];

function addActivity(event) {
  activityFeed.unshift(event);
  if (activityFeed.length > ACTIVITY_FEED_SIZE) activityFeed.pop();
}

// ─── REST API ──────────────────────────────────────────────────────────────────

/**
 * GET /api/grid
 * Returns the full current grid state as a JSON array.
 * Called once on page load to hydrate the client store.
 */
app.get('/api/grid', async (req, res) => {
  try {
    const grid = await gridManager.getFullGrid();
    res.json({ tiles: grid });
  } catch (err) {
    logger.error({ err }, 'GET /api/grid failed');
    res.status(500).json({ error: 'Failed to load grid' });
  }
});

/**
 * GET /api/health
 * Used by Railway / Vercel health checks and the README demo.
 */
app.get('/api/health', async (req, res) => {
  const tiles = await gridManager.getFullGrid();
  res.json({
    status: 'ok',
    redis: usingRedis,
    tiles: tiles.length,
    users: sessionManager.getOnlineCount(),
    uptime: Math.floor(process.uptime()),
  });
});

/**
 * GET /api/leaderboard
 * Snapshot leaderboard for REST consumers.
 */
app.get('/api/leaderboard', async (req, res) => {
  const lb = await computeLeaderboard();
  res.json({ leaderboard: lb });
});

// ─── Socket.io Events ──────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  logger.info({ socketId: socket.id }, 'Client connected');

  // Send initial state immediately to the newly connected client
  (async () => {
    try {
      const [grid, leaderboard] = await Promise.all([
        gridManager.getFullGrid(),
        computeLeaderboard(),
      ]);
      socket.emit('init', {
        grid,
        leaderboard,
        onlineCount: sessionManager.getOnlineCount(),
        activityFeed: activityFeed.slice(0, 10),
      });
    } catch (err) {
      logger.error({ err }, 'Error emitting init');
    }
  })();

  // ── join ──────────────────────────────────────────────────────────────────
  socket.on('join', ({ username, color }) => {
    // Sanitize: strip HTML tags, enforce length
    const cleanUsername = String(username || 'Anonymous')
      .replace(/<[^>]*>/g, '')
      .trim()
      .slice(0, MAX_USERNAME_LEN) || 'Anonymous';

    const cleanColor = /^#[0-9A-Fa-f]{6}$/.test(color) ? color : '#e5ff00';

    sessionManager.addUser(socket.id, cleanUsername, cleanColor);

    // Tell this socket their confirmed ID
    socket.emit('joined', { id: socket.id, username: cleanUsername, color: cleanColor });

    // Tell everyone (including this user) the new online count
    const onlineCount = sessionManager.getOnlineCount();
    const activity = {
      type: 'join',
      username: cleanUsername,
      color: cleanColor,
      timestamp: Date.now(),
    };
    addActivity(activity);

    io.emit('user_joined', { username: cleanUsername, color: cleanColor, onlineCount });
    io.emit('activity', activity);

    logger.info({ username: cleanUsername, socketId: socket.id }, 'User joined');
  });

  // ── capture_tile ──────────────────────────────────────────────────────────
  socket.on('capture_tile', async ({ x, y }) => {
    const user = sessionManager.getUser(socket.id);

    if (!user) {
      socket.emit('error', { message: 'You must join before capturing tiles.' });
      return;
    }

    const result = await gridManager.captureTile(Number(x), Number(y), user);

    if (result.success) {
      // Broadcast the capture to ALL clients (including sender)
      io.emit('tile_captured', result.tile);

      // Recompute and broadcast leaderboard
      const leaderboard = await computeLeaderboard();
      io.emit('leaderboard_update', leaderboard);

      // Add to activity feed
      const activity = {
        type: 'capture',
        username: user.username,
        color: user.color,
        x,
        y,
        timestamp: Date.now(),
      };
      addActivity(activity);
      io.emit('activity', activity);

      logger.debug({ x, y, username: user.username }, 'Tile captured → broadcast');
    } else {
      // Only tell the requesting socket about the failure
      socket.emit('capture_failed', result);
    }
  });

  // ── disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    const user = sessionManager.getUser(socket.id);
    sessionManager.removeUser(socket.id);
    gridManager.removeUser(socket.id);

    const onlineCount = sessionManager.getOnlineCount();

    if (user) {
      const activity = {
        type: 'leave',
        username: user.username,
        color: user.color,
        timestamp: Date.now(),
      };
      addActivity(activity);
      io.emit('user_left', { username: user.username, onlineCount });
      io.emit('activity', activity);
      logger.info({ username: user.username, reason }, 'User disconnected');
    }
  });
});

// ─── Start ─────────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  logger.info(`🚀 TERRITORIA server running on port ${PORT}`);
  logger.info(`   Redis: ${usingRedis ? '✅ connected' : '⚡ in-memory fallback'}`);
  logger.info(`   CORS origin: ${CLIENT_URL}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully');
  httpServer.close(() => process.exit(0));
});
