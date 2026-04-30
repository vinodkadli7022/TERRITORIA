import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useStore from '../store/useStore';
import { timeAgo } from '../utils/colorUtils';

/**
 * ActivityFeed — Real-time event log (last 20 events)
 *
 * Events: tile captures, joins, leaves.
 * Auto-scrolls (newest at top). Fades older entries via opacity.
 */
export default function ActivityFeed() {
  const activityFeed = useStore((s) => s.activityFeed);

  if (activityFeed.length === 0) {
    return (
      <div className="panel">
        <div className="panel-title">Activity</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center', padding: '8px 0' }}>
          Waiting for action…
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-title">Activity</div>
      <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
        <AnimatePresence initial={false}>
          {activityFeed.slice(0, 12).map((event, i) => {
            const opacity = Math.max(0.25, 1 - i * 0.07);
            let text = '';
            if (event.type === 'capture') {
              text = `captured (${event.x}, ${event.y})`;
            } else if (event.type === 'join') {
              text = 'joined the battle';
            } else if (event.type === 'leave') {
              text = 'left the field';
            }

            return (
              <motion.div
                key={`${event.timestamp}-${event.type}`}
                className="activity-item"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{ opacity }}
              >
                <span
                  className="activity-dot"
                  style={{ backgroundColor: event.color || '#666' }}
                />
                <span>
                  <span style={{ color: event.color || 'var(--text-secondary)', fontWeight: 700 }}>
                    {event.username}
                  </span>{' '}
                  {text}
                </span>
                <span className="activity-time">{timeAgo(event.timestamp)}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
