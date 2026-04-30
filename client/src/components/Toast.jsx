import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useStore from '../store/useStore';

/**
 * Toast — Bottom-right notification stack
 *
 * Types: 'success' | 'info' | 'error'
 * Auto-dismissed after 2.5s (managed in useStore.addToast).
 * Slides in from right, fades out on exit.
 */
export default function Toast() {
  const { toasts, removeToast } = useStore();

  return (
    <div className="toast-stack">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            className={`toast ${toast.type}`}
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={() => removeToast(toast.id)}
          >
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
