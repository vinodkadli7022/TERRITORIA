// ─── Game Constants ────────────────────────────────────────────────────────────
// These are the single source of truth for all tunable game parameters.
// Change COOLDOWN_MS to adjust the capture rate; GRID_SIZE affects memory usage
// linearly (~100 bytes per tile in Redis).

export const GRID_SIZE = 50;          // 50×50 = 2500 tiles
export const COOLDOWN_MS = 3000;      // milliseconds between captures per user
export const MAX_USERNAME_LEN = 20;   // capped to avoid UI overflow
export const LEADERBOARD_SIZE = 10;   // top-N shown in leaderboard panel
export const ACTIVITY_FEED_SIZE = 20; // server keeps last-N activity events
