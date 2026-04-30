/**
 * useSocket.js — Socket.io connection lifecycle and event wiring
 *
 * This hook:
 *  1. Creates and memoizes the socket connection
 *  2. Registers all server→client event listeners
 *  3. Handles reconnection transparently (socket.io does this automatically)
 *  4. Uses Page Visibility API to track tab focus (pauses UI-only timers)
 *
 * Returns: { socket, isConnected }
 *
 * Usage: call once in App.jsx. All children read state from Zustand.
 */

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import useStore from '../store/useStore';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

let socketInstance = null; // singleton — one connection per tab

export function useSocket() {
  const [isConnected, setIsConnectedLocal] = useState(false);
  const hasJoined = useRef(false);

  const {
    setGrid,
    updateTile,
    setLeaderboard,
    setOnlineCount,
    setCooldown,
    startCooldown,
    addToast,
    addActivity,
    setActivityFeed,
    setUser,
    setIsConnected,
    setIsLoading,
  } = useStore.getState();

  useEffect(() => {
    // Create socket only once
    if (!socketInstance) {
      socketInstance = io(SERVER_URL, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });
    }
    const socket = socketInstance;

    // ── Connection events ─────────────────────────────────────────────────
    socket.on('connect', () => {
      setIsConnectedLocal(true);
      setIsConnected(true);

      // Re-join if we have a saved user and haven't joined yet this session
      const saved = localStorage.getItem('territoria_user');
      if (saved && !hasJoined.current) {
        const { username, color } = JSON.parse(saved);
        socket.emit('join', { username, color });
      }
    });

    socket.on('disconnect', () => {
      setIsConnectedLocal(false);
      setIsConnected(false);
      hasJoined.current = false;
    });

    socket.on('connect_error', () => {
      addToast('Connection lost — retrying…', 'error');
    });

    // ── Game events ────────────────────────────────────────────────────────

    /**
     * 'init' — received immediately after connect.
     * Hydrates the full grid + leaderboard + online count.
     */
    socket.on('init', ({ grid, leaderboard, onlineCount, activityFeed }) => {
      setGrid(grid);
      setLeaderboard(leaderboard);
      setOnlineCount(onlineCount);
      if (activityFeed) setActivityFeed(activityFeed);
      setIsLoading(false);
    });

    /**
     * 'joined' — server confirms our join and assigns our socket ID.
     * We update the user store with the server-assigned ID.
     */
    socket.on('joined', ({ id, username, color }) => {
      setUser({ id, username, color });
      hasJoined.current = true;
    });

    /**
     * 'tile_captured' — a tile was captured by any user (including us).
     * We update the grid and show a toast only if we captured it.
     */
    socket.on('tile_captured', (tile) => {
      updateTile(tile);
      const currentUser = useStore.getState().user;
      if (currentUser && tile.owner === currentUser.id) {
        addToast(`✓ You captured (${tile.x}, ${tile.y})`, 'success');
      }
    });

    /** 'leaderboard_update' — new rankings after every capture */
    socket.on('leaderboard_update', (leaderboard) => {
      setLeaderboard(leaderboard);
    });

    /** 'user_joined' — another user joined the battle */
    socket.on('user_joined', ({ username, onlineCount }) => {
      setOnlineCount(onlineCount);
      addToast(`⚔ ${username} joined the battle`, 'info');
    });

    /** 'user_left' — a user disconnected */
    socket.on('user_left', ({ username, onlineCount }) => {
      setOnlineCount(onlineCount);
    });

    /**
     * 'capture_failed' — server rejected our capture.
     * Most common reason: cooldown not expired yet.
     */
    socket.on('capture_failed', ({ reason, remaining }) => {
      if (reason === 'cooldown' && remaining) {
        setCooldown(remaining);
      }
    });

    /** 'activity' — a new activity event from the server */
    socket.on('activity', (event) => {
      addActivity(event);
    });

    /** 'error' — generic server error */
    socket.on('error', ({ message }) => {
      addToast(`Error: ${message}`, 'error');
    });

    return () => {
      // Remove only event listeners — do NOT disconnect the socket.
      // The singleton persists across re-renders (StrictMode double-mount safe).
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('init');
      socket.off('joined');
      socket.off('tile_captured');
      socket.off('leaderboard_update');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('capture_failed');
      socket.off('activity');
      socket.off('error');
    };
  }, []);

  return { socket: socketInstance, isConnected };
}

/** Expose socket for direct use in event emitters (Tile.jsx etc.) */
export function getSocket() {
  return socketInstance;
}
