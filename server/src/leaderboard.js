/**
 * leaderboard.js — Compute live tile ownership rankings
 *
 * This runs on every capture event. For 2500 tiles it's O(n) and fast.
 * At scale (millions of tiles) this would be a sorted set in Redis (ZADD/ZREVRANGE).
 */

import { getAllTiles } from './redis.js';
import { LEADERBOARD_SIZE } from './constants.js';
import { logger } from './logger.js';

/**
 * Reads all tiles and aggregates per-owner counts.
 * Returns top-N sorted by tile count descending.
 *
 * Shape: [{ owner, username, color, count, percentage }]
 */
export async function computeLeaderboard() {
  try {
    const tiles = await getAllTiles();

    // Aggregate: owner → { username, color, count }
    const ownerMap = new Map();
    for (const tile of tiles) {
      if (!tile.owner) continue;

      if (ownerMap.has(tile.owner)) {
        ownerMap.get(tile.owner).count += 1;
      } else {
        ownerMap.set(tile.owner, {
          owner: tile.owner,
          username: tile.username,
          color: tile.color,
          count: 1,
        });
      }
    }

    const total = tiles.length;

    // Sort descending and take top-N
    return Array.from(ownerMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, LEADERBOARD_SIZE)
      .map((entry) => ({
        ...entry,
        percentage: total > 0 ? ((entry.count / 2500) * 100).toFixed(1) : '0.0',
      }));
  } catch (err) {
    logger.error({ err }, 'computeLeaderboard failed');
    return [];
  }
}
