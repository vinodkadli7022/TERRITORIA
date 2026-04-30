import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useStore from '../store/useStore';

/**
 * Leaderboard — Live top-10 tile owners
 *
 * Uses Framer Motion's layout animations to smoothly animate rank changes
 * whenever the leaderboard updates. Each row has a stable `key` (owner ID)
 * so React/Framer can track items across re-orders.
 */
export default function Leaderboard() {
  const leaderboard = useStore((s) => s.leaderboard);
  const user = useStore((s) => s.user);

  if (leaderboard.length === 0) {
    return (
      <div className="panel">
        <div className="panel-title">Leaderboard</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center', padding: '16px 0' }}>
          No tiles claimed yet.<br />Be the first!
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-title">Leaderboard</div>
      <AnimatePresence initial={false}>
        {leaderboard.map((entry, index) => {
          const isMe = user && entry.owner === user.id;
          const isFirst = index === 0;

          return (
            <motion.div
              key={entry.owner}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`lb-row${isMe ? ' is-me' : ''}`}
            >
              {/* Rank */}
              <span className={`lb-rank${isFirst ? ' top' : ''}`}>
                {isFirst ? '👑' : `${index + 1}`}
              </span>

              {/* Color dot */}
              <span
                className="lb-dot"
                style={{
                  backgroundColor: entry.color,
                  boxShadow: isFirst ? `0 0 6px ${entry.color}` : 'none',
                }}
              />

              {/* Username */}
              <span className="lb-name" style={{ color: isMe ? 'var(--accent)' : 'var(--text-primary)' }}>
                {entry.username}
                {isMe && <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}> (you)</span>}
              </span>

              {/* Tile count */}
              <span className="lb-count">{entry.count}</span>

              {/* Board percentage */}
              <span className="lb-pct">{entry.percentage}%</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
