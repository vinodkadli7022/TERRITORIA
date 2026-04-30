/**
 * useStore.js — Zustand global state store
 *
 * Single source of truth for:
 *  - Grid tile data (keyed "x_y")
 *  - Current user identity
 *  - Leaderboard rankings
 *  - Online count, cooldown timer, toast queue, activity feed
 *
 * All Socket.io event handlers write directly into this store,
 * and React components read from it via fine-grained selectors.
 */

import { create } from 'zustand';

let toastId = 0;

const useStore = create((set, get) => ({
  // ── Grid ──────────────────────────────────────────────────────────────────
  // Sparse map: only claimed tiles are stored. Key = "x_y".
  grid: {},

  /** Bulk-load tiles from /api/grid response */
  setGrid(tiles) {
    const grid = {};
    for (const tile of tiles) {
      grid[`${tile.x}_${tile.y}`] = tile;
    }
    set({ grid });
  },

  /** Single tile update from 'tile_captured' socket event */
  updateTile(tile) {
    set((state) => ({
      grid: { ...state.grid, [`${tile.x}_${tile.y}`]: tile },
      lastCaptured: { x: tile.x, y: tile.y },
    }));
  },

  lastCaptured: null,

  // ── User ──────────────────────────────────────────────────────────────────
  user: null,
  setUser(user) { set({ user }); },

  // ── Leaderboard ───────────────────────────────────────────────────────────
  leaderboard: [],
  setLeaderboard(leaderboard) { set({ leaderboard }); },

  // ── Online Count ──────────────────────────────────────────────────────────
  onlineCount: 0,
  setOnlineCount(n) { set({ onlineCount: n }); },

  // ── Cooldown ──────────────────────────────────────────────────────────────
  // cooldownUntil is a timestamp (ms). null = no cooldown active.
  cooldownUntil: null,

  /**
   * Called when server sends 'capture_failed' with reason='cooldown'.
   * Sets cooldownUntil so CooldownBar knows how long to show the timer.
   */
  setCooldown(remainingMs) {
    set({ cooldownUntil: Date.now() + remainingMs });
  },

  /**
   * Called by Grid.jsx onClick to pre-emptively set cooldown for instant feedback.
   * The server authoritative response may adjust this.
   */
  startCooldown(durationMs) {
    set({ cooldownUntil: Date.now() + durationMs });
  },

  clearCooldown() { set({ cooldownUntil: null }); },

  // ── Toasts ────────────────────────────────────────────────────────────────
  toasts: [],

  addToast(message, type = 'info') {
    const id = ++toastId;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, createdAt: Date.now() }],
    }));
    // Auto-remove after 2.5s
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 2500);
  },

  removeToast(id) {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  // ── Activity Feed ─────────────────────────────────────────────────────────
  activityFeed: [],

  addActivity(event) {
    set((state) => ({
      activityFeed: [event, ...state.activityFeed].slice(0, 20),
    }));
  },

  setActivityFeed(feed) { set({ activityFeed: feed }); },

  // ── Connection State ──────────────────────────────────────────────────────
  isConnected: false,
  setIsConnected(v) { set({ isConnected: v }); },

  isLoading: true,
  setIsLoading(v) { set({ isLoading: v }); },

  // ── Derived helpers ───────────────────────────────────────────────────────
  /** Count how many tiles the current user owns */
  getMyTileCount() {
    const { grid, user } = get();
    if (!user) return 0;
    return Object.values(grid).filter((t) => t.owner === user.id).length;
  },
}));

export default useStore;
