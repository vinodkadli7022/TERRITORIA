import React, { memo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Tooltip } from 'react-tooltip';
import { getContrastColor, timeAgo } from '../utils/colorUtils';
import { getSocket } from '../hooks/useSocket';
import useStore from '../store/useStore';

const COOLDOWN_MS = 3000;

/**
 * Tile — Individual grid cell
 *
 * Renders one of three visual states:
 *  1. Unclaimed  — dark background, subtle
 *  2. Claimed    — owner's color
 *  3. Owned (me) — my color + white ring
 *
 * On click: validates cooldown locally (optimistic UX), then emits to server.
 * Framer Motion handles the flash animation on capture.
 *
 * Memoized aggressively — only re-renders when tileData or ownership changes.
 */
const Tile = memo(function Tile({ x, y, tileData, isOwned }) {
  const shakeRef = useRef(null);
  const tooltipId = `tile-${x}-${y}`;

  const handleClick = useCallback(() => {
    const { cooldownUntil, user, startCooldown } = useStore.getState();

    // Cooldown check — give instant visual feedback
    if (cooldownUntil && Date.now() < cooldownUntil) {
      // Trigger shake on the cooldown bar via custom event
      window.dispatchEvent(new CustomEvent('cooldown-shake'));
      return;
    }

    if (!user) return; // Must have joined first

    const socket = getSocket();
    if (!socket?.connected) return;

    // Optimistic cooldown — UI responds instantly before server confirms
    startCooldown(COOLDOWN_MS);
    socket.emit('capture_tile', { x, y });
  }, [x, y]);

  // Determine background color
  const bg = tileData ? tileData.color : '#1a1a1a';
  const textColor = tileData ? getContrastColor(tileData.color) : '#333';

  // Tooltip content
  const tooltipContent = tileData
    ? `${tileData.username} · ${timeAgo(tileData.capturedAt)}`
    : 'Unclaimed — click to capture';

  return (
    <>
      <motion.div
        className="tile"
        onClick={handleClick}
        data-tooltip-id={tooltipId}
        data-tooltip-content={tooltipContent}
        style={{
          outline: isOwned ? '2px solid rgba(255,255,255,0.8)' : 'none',
          outlineOffset: '-1px',
          zIndex: isOwned ? 2 : 1,
        }}
        animate={{ backgroundColor: bg }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        whileHover={{
          scale: 1.35,
          zIndex: 10,
          transition: { duration: 0.08 },
        }}
        whileTap={{ scale: 0.9 }}
        layout={false}
      >
        <div
          className="tile-inner"
          style={{ backgroundColor: bg }}
        />
      </motion.div>
      <Tooltip
        id={tooltipId}
        place="top"
        delayShow={300}
        style={{
          zIndex: 999,
          fontSize: '11px',
          padding: '5px 9px',
        }}
      />
    </>
  );
}, (prev, next) => {
  // Custom comparison — skip re-render unless data actually changed
  if (prev.isOwned !== next.isOwned) return false;
  if (!prev.tileData && !next.tileData) return true;
  if (!prev.tileData || !next.tileData) return false;
  return (
    prev.tileData.owner === next.tileData.owner &&
    prev.tileData.capturedAt === next.tileData.capturedAt
  );
});

export default Tile;
