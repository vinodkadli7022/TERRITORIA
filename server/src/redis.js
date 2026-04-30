/**
 * redis.js — Redis client with transparent in-memory fallback
 *
 * Strategy:
 *  1. If REDIS_URL is set, connect to Redis (Redis Cloud / Railway Redis).
 *  2. If REDIS_URL is absent OR connection fails, fall back to a plain JS Map.
 *     The Map mirrors the exact same API surface so the rest of the app is blind
 *     to which backend it's using.
 *
 * Tile key format: "tile_{x}_{y}"
 * Tile value format: JSON string of { owner, username, color, capturedAt }
 */

import Redis from 'ioredis';
import { logger } from './logger.js';

// ─── In-Memory Fallback ────────────────────────────────────────────────────────
const memStore = new Map();

const memAdapter = {
  async hset(hash, key, value) { memStore.set(`${hash}:${key}`, value); },
  async hget(hash, key) { return memStore.get(`${hash}:${key}`) ?? null; },
  async hgetall(hash) {
    const prefix = `${hash}:`;
    const result = {};
    for (const [k, v] of memStore.entries()) {
      if (k.startsWith(prefix)) result[k.slice(prefix.length)] = v;
    }
    return Object.keys(result).length ? result : null;
  },
  async hdel(hash, key) { memStore.delete(`${hash}:${key}`); },
  async ping() { return 'PONG'; },
};

// ─── Redis Client ──────────────────────────────────────────────────────────────
let client = memAdapter; // default: in-memory
let usingRedis = false;

if (process.env.REDIS_URL) {
  try {
    const redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 5000,
    });

    await redisClient.connect();
    await redisClient.ping();

    client = redisClient;
    usingRedis = true;
    logger.info('✅ Connected to Redis');
  } catch (err) {
    logger.warn({ err }, '⚠️  Redis connection failed — using in-memory fallback');
  }
} else {
  logger.info('ℹ️  No REDIS_URL set — using in-memory store (dev mode)');
}

// ─── Tile Helpers ──────────────────────────────────────────────────────────────
const HASH_KEY = 'grid'; // all tiles live under a single Redis hash

/**
 * Read a single tile. Returns parsed object or null if unclaimed.
 */
export async function getTile(x, y) {
  try {
    const raw = await client.hget(HASH_KEY, `${x}_${y}`);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    logger.error({ err, x, y }, 'getTile failed');
    return null;
  }
}

/**
 * Write a tile. data = { owner, username, color, capturedAt }
 */
export async function setTile(x, y, data) {
  try {
    await client.hset(HASH_KEY, `${x}_${y}`, JSON.stringify(data));
  } catch (err) {
    logger.error({ err, x, y }, 'setTile failed');
  }
}

/**
 * Delete a tile (used in tests / admin reset).
 */
export async function deleteTile(x, y) {
  try {
    await client.hdel(HASH_KEY, `${x}_${y}`);
  } catch (err) {
    logger.error({ err, x, y }, 'deleteTile failed');
  }
}

/**
 * Get all tiles. Returns array of { x, y, ...tileData } objects.
 * Returns [] if grid is empty (normal on first launch).
 */
export async function getAllTiles() {
  try {
    const raw = await client.hgetall(HASH_KEY);
    if (!raw) return [];

    return Object.entries(raw).map(([key, value]) => {
      const [x, y] = key.split('_').map(Number);
      return { x, y, ...JSON.parse(value) };
    });
  } catch (err) {
    logger.error({ err }, 'getAllTiles failed');
    return [];
  }
}

export { usingRedis };
