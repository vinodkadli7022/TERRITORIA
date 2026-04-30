# TERRITORIA — Real-Time Territory Grid

> A live multiplayer territory war on a 50×50 grid. Every visitor gets a unique color and username. Click tiles to capture them. All captures broadcast instantly to every connected client via WebSockets.

## 🔗 Live Demo

*Deploy to Railway + Vercel using the instructions below.*

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (React 18 + Vite)                                      │
│  ┌──────────┐  ┌─────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ Zustand  │  │ Grid.jsx│  │ Leaderboard  │  │ useSocket  │  │
│  │  Store   │◄─│ 50×50   │  │  (Framer)    │  │  (Socket)  │  │
│  └──────────┘  └─────────┘  └──────────────┘  └─────┬──────┘  │
└────────────────────────────────────────────────────── │ ────────┘
                                                        │ WebSocket
                                            ┌───────────▼──────────┐
                                            │  Node.js + Express   │
                                            │  Socket.io Server    │
                                            │  ┌───────────────┐   │
                                            │  │ GridManager   │   │
                                            │  │ SessionManager│   │
                                            │  │ Leaderboard   │   │
                                            │  └───────┬───────┘   │
                                            └──────────│───────────┘
                                                       │
                                            ┌──────────▼───────────┐
                                            │  Redis / In-Memory   │
                                            │  tile_{x}_{y} → JSON │
                                            └──────────────────────┘
```

**Event flow in 3 sentences:**
User clicks tile → client emits `capture_tile` via WebSocket → server validates (cooldown + bounds), writes to Redis, and broadcasts `tile_captured` to all clients → every browser updates the grid tile + leaderboard simultaneously.

---

## ⚡ Tech Stack & Why

- **Frontend:** React 18 + Vite — Fast HMR, concurrent rendering, mature ecosystem
- **State Management:** Zustand — Minimal boilerplate vs Redux; socket callbacks write directly into store
- **Real-time:** Socket.io — Battle-tested WS abstraction with fallback polling + reconnection
- **Animations:** Framer Motion — Declarative layout animations for leaderboard reordering; spring-based tile flash
- **Styling:** Tailwind + Vanilla CSS — Tailwind for utilities; custom CSS vars for the full design system
- **Backend:** Node.js + Express — Lightweight, non-blocking, native WS support
- **Persistence:** Redis / In-Memory Map — O(1) tile reads; 2500 tiles ≈ 250KB fits comfortably in Redis free tier
- **Logging:** Pino — Structured JSON in production; pretty-printed in dev

---

## 🚀 Running Locally

### Prerequisites
- Node.js ≥ 18
- (Optional) Redis — app falls back to in-memory store if not available

### 1. Clone
```bash
git clone https://github.com/you/territoria.git
cd territoria
```

### 2. Server setup
```bash
cd server
cp .env.example .env
# Edit .env — set REDIS_URL if you have Redis, leave blank for in-memory mode
npm install
npm run dev
# → Server running on http://localhost:3001
```

### 3. Client setup
```bash
cd ../client
cp .env.example .env
npm install
npm run dev
# → Client running on http://localhost:5173
```

### 4. Open & test
Open `http://localhost:5173` in **two browser tabs**. Enter different usernames, click tiles, watch them update across both tabs instantly.

---


## 🎮 How It Works

### Real-Time (Socket.io)
Every capture follows this exact path:
1. `Tile.jsx` onClick → check Zustand cooldown → `socket.emit('capture_tile', { x, y })`
2. Server: validate bounds → validate cooldown → write to Redis
3. Server: `io.emit('tile_captured', tile)` → broadcast to **all** clients
4. All clients: `store.updateTile(tile)` → Framer Motion re-renders with flash animation
5. Server: recompute leaderboard → `io.emit('leaderboard_update', [...])` → all clients animate rank changes

### Conflict Handling
The server is the **single source of truth**. Client-side cooldown is optimistic (for instant UX feedback), but the server rejects any capture that violates the 3-second cooldown and responds with `capture_failed`. If two users click the same tile simultaneously, whichever request arrives at the server first wins.

### State
Redis stores each tile as a hash field: `grid → tile_{x}_{y} = JSON`. On first load, the client fetches `/api/grid` (REST) to hydrate — subsequent updates are all WebSocket. This hybrid approach means the grid loads fast even if the socket hasn't connected yet.

---


## 📁 Project Structure

```
territoria/
├── client/                    ← React 18 + Vite frontend
│   ├── src/
│   │   ├── components/        ← UI components (Grid, Tile, Leaderboard, etc.)
│   │   ├── hooks/useSocket.js ← Socket.io lifecycle + event wiring
│   │   ├── store/useStore.js  ← Zustand global state
│   │   ├── utils/colorUtils.js← Color generation + contrast + formatting
│   │   ├── App.jsx            ← Root layout + error boundary
│   │   └── index.css          ← Full design system (CSS variables + components)
│   └── package.json
│
└── server/                    ← Node.js + Express + Socket.io
    ├── src/
    │   ├── index.js           ← Entry point: REST + Socket.io events
    │   ├── redis.js           ← Redis client + in-memory fallback
    │   ├── gridManager.js     ← Capture validation + cooldown
    │   ├── sessionManager.js  ← Connected user tracking
    │   ├── leaderboard.js     ← Tile ownership aggregation
    │   ├── logger.js          ← Pino logger (pretty dev / JSON prod)
    │   └── constants.js       ← GRID_SIZE, COOLDOWN_MS, etc.
    └── package.json
```
