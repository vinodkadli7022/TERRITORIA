/**
 * logger.js — Pino logger instance
 *
 * Uses pino-pretty in development for human-readable output.
 * In production (NODE_ENV=production), outputs structured JSON
 * suitable for Railway / Render log aggregation.
 */

import pino from 'pino';

export const logger = pino(
  process.env.NODE_ENV === 'production'
    ? { level: 'info' }
    : {
        level: 'debug',
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      }
);
