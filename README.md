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

| Layer | Technology | Reason |
|---|---|---|
| Frontend framework | React 18 + Vite | Fast HMR, concurrent rendering, mature ecosystem |
| State management | Zustand | Minimal boilerplate vs Redux; socket callbacks write directly into store |
| Real-time | Socket.io | Battle-tested WS abstraction with fallback polling + reconnection |
| Animations | Framer Motion | Declarative layout animations for leaderboard reordering; spring-based tile flash |
| Styling | Tailwind + Vanilla CSS | Tailwind for utilities; custom CSS vars for the full design system |
| Backend | Node.js + Express | Lightweight, non-blocking, native WS support |
| Persistence | Redis / In-Memory Map | O(1) tile reads; 2500 tiles ≈ 250KB — fits comfortably in Redis free tier |
| Logging | Pino | Structured JSON in production; pretty-printed in dev |

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

## 🌍 Production Deployment

The app is built to be deployed on a free-tier friendly modern stack. Follow these exact steps:

### 1. Database: Redis Cloud
1. Create a free account at [Redis Cloud](https://redis.com/try-free/).
2. Create a new subscription (Free 30MB tier).
3. Find your **Public Endpoint** and **Password** in the database configuration.
4. Construct your Redis URL: `redis://default:YOUR_PASSWORD@YOUR_PUBLIC_ENDPOINT:PORT`.

### 2. Backend: Railway
1. Push your `territoria` repository to GitHub.
2. Go to [Railway.app](https://railway.app/) and create a **New Project** → **Deploy from GitHub repo**.
3. Go to Settings > Build > **Root Directory** and set it to `/server`.
4. Go to **Variables** and add:
   - `PORT`: `3001`
   - `REDIS_URL`: *(Your Redis Cloud URL from Step 1)*
   - `CLIENT_URL`: *(Leave blank for now)*
5. Go to Settings > Public Networking and click **Generate Domain** (e.g., `https://territoria-server.up.railway.app`).

### 3. Frontend: Vercel
1. Go to [Vercel.com](https://vercel.com/) and click **Add New Project**.
2. Import your `territoria` GitHub repository.
3. In the project configuration:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
4. Expand **Environment Variables** and add:
   - `VITE_SERVER_URL`: *(Your Railway Domain from Step 2)*
5. Click **Deploy**. Vercel will give you a live URL (e.g., `https://territoria-client.vercel.app`).

### 4. Final Connection
1. Go back to your **Railway** dashboard.
2. Update the `CLIENT_URL` environment variable to match your new Vercel URL.
3. Railway will automatically restart. Your app is now fully live!

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

## ⚖️ Trade-offs Made

### Redis vs PostgreSQL
Redis was chosen because:
- Tile data is write-heavy (every capture = 1 write, 1 broadcast)
- No relational queries needed — tiles are independent key-value entries
- Sub-millisecond reads/writes critical for real-time feel
- 2500 tiles × ~100 bytes = 250KB — trivially fits in Redis free tier (30MB)

PostgreSQL would be better for: persistent user accounts, audit trails, complex queries across game history.

### No Auth vs Sessions
Users are identified by socket ID (server-assigned) + localStorage (color/username persistence across refreshes). This keeps onboarding friction to zero — you land, pick a name, you're playing. For production: add JWT auth + persistent user accounts to maintain territory across sessions.

### In-Memory Cooldowns
Cooldowns are a `Map<socketId, timestamp>` on the server. This is simple and fast, but **breaks under horizontal scaling** — a second server instance has no knowledge of cooldowns set by the first.

**Fix at scale:** Store cooldowns as Redis keys with TTL:
```js
await redis.set(`cooldown:${socketId}`, 1, 'PX', COOLDOWN_MS);
const onCooldown = await redis.exists(`cooldown:${socketId}`);
```

---

## 🌟 Bonus Features

| Feature | Description |
|---|---|
| **Cooldown bar** | rAF-driven smooth progress bar; shakes when user clicks during cooldown |
| **Live leaderboard** | Top-10 with Framer Motion layout animations on rank changes; crown on #1 |
| **Activity feed** | Last 20 events (captures, joins, leaves) with opacity fade on older entries |
| **Territory stats** | Header shows "You own X tiles (Y%)" — updates live with every capture |
| **Toast notifications** | Slide-in success/info/error toasts; auto-dismiss 2.5s |
| **Online counter** | Animated number flip when user count changes |
| **In-memory fallback** | Server works with zero Redis config — transparent fallback |
| **Reconnection** | Socket.io auto-reconnects with exponential backoff |
| **Error boundary** | React error boundary catches render crashes gracefully |

---

## 📈 What I'd Improve With More Time

1. **Persistent accounts** — JWT auth + PostgreSQL for cross-session territory retention
2. **Tile locking / area control** — capture bonus for controlling entire regions
3. **WebRTC cursor presence** — see other users' cursors moving in real-time
4. **Horizontal scaling** — Redis pub/sub for multi-server Socket.io (socket.io-redis adapter)
5. **Spectator mode** — read-only view with highlighted player tracking
6. **Replay system** — Redis Streams to record and replay game history
7. **Rate limit per user** — Redis token bucket per socket (not just IP-based)

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
