import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../store/useStore';

/**
 * OnlineCounter — Pulsing green dot + animated live user count
 * in the top-right corner of the header.
 */
export default function OnlineCounter() {
  const onlineCount = useStore((s) => s.onlineCount);

  return (
    <div className="online-counter">
      <span className="online-dot" />
      <AnimatePresence mode="popLayout">
        <motion.span
          key={onlineCount}
          className="online-count"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2 }}
        >
          {onlineCount}
        </motion.span>
      </AnimatePresence>
      <span>online</span>
    </div>
  );
}
