/**
 * sessionManager.js — Tracks connected users (socket sessions)
 *
 * Each user entry: { id, username, color, connectedAt }
 * Sessions are ephemeral — they live only as long as the socket connection.
 */

export class SessionManager {
  constructor() {
    // Map<socketId, { id, username, color, connectedAt }>
    this.sessions = new Map();
  }

  /**
   * Register a new user when they emit 'join'.
   */
  addUser(socketId, username, color) {
    this.sessions.set(socketId, {
      id: socketId,
      username,
      color,
      connectedAt: Date.now(),
    });
  }

  /**
   * Remove user on disconnect.
   */
  removeUser(socketId) {
    this.sessions.delete(socketId);
  }

  /**
   * Look up a user by socket ID. Returns null if not found.
   */
  getUser(socketId) {
    return this.sessions.get(socketId) ?? null;
  }

  /**
   * Total number of joined (named) users.
   */
  getOnlineCount() {
    return this.sessions.size;
  }

  /**
   * All active users as an array.
   */
  getAllUsers() {
    return Array.from(this.sessions.values());
  }
}
