/**
 * gridManager.js — Core game logic for tile capture
 *
 * GridManager is the single authority on:
 *  - Whether a capture is valid (bounds, cooldown)
 *  - Reading the full grid state
 *
 * Cooldowns are stored in-memory (per server process). At scale this would
 * move to Redis with a TTL key per user — noted in README trade-offs.
 */

import { getTile, setTile, getAllTiles } from './redis.js';
import { GRID_SIZE, COOLDOWN_MS } from './constants.js';
import { logger } from './logger.js';

export class GridManager {
  constructor() {
    // Map<socketId, lastCaptureTimestamp>
    this.cooldowns = new Map();
  }

  /**
   * Attempt to capture tile (x, y) for the given user.
   *
   * Returns:
   *   { success: true, tile: {...} }
   *   { success: false, reason: 'cooldown', remaining: ms }
   *   { success: false, reason: 'invalid_coords' }
   */
  async captureTile(x, y, user) {
    // 1. Validate coordinates
    if (
      typeof x !== 'number' || typeof y !== 'number' ||
      x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE ||
      !Number.isInteger(x) || !Number.isInteger(y)
    ) {
      logger.warn({ x, y, userId: user.id }, 'Invalid tile coordinates');
      return { success: false, reason: 'invalid_coords' };
    }

    // 2. Check cooldown
    const lastCapture = this.cooldowns.get(user.id) ?? 0;
    const elapsed = Date.now() - lastCapture;
    if (elapsed < COOLDOWN_MS) {
      const remaining = COOLDOWN_MS - elapsed;
      return { success: false, reason: 'cooldown', remaining };
    }

    // 3. Build tile data
    const tileData = {
      owner: user.id,
      username: user.username,
      color: user.color,
      capturedAt: Date.now(),
    };

    // 4. Persist to Redis (or in-memory fallback)
    await setTile(x, y, tileData);

    // 5. Update cooldown
    this.cooldowns.set(user.id, Date.now());

    logger.debug({ x, y, username: user.username }, 'Tile captured');

    return { success: true, tile: { x, y, ...tileData } };
  }

  /**
   * Returns the full grid as a flat array.
   * Only returns claimed tiles — unclaimed tiles are implicitly null on the client.
   */
  async getFullGrid() {
    return getAllTiles();
  }

  /**
   * Clean up cooldown entry when user disconnects.
   * Prevents unbounded Map growth in long-running sessions.
   */
  removeUser(socketId) {
    this.cooldowns.delete(socketId);
  }
}
