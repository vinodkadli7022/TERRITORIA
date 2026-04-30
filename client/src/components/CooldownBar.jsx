import React, { useEffect, useState, useRef } from 'react';
import useStore from '../store/useStore';

const COOLDOWN_MS = 3000;

/**
 * CooldownBar — Full-width progress bar at the bottom of the screen.
 *
 * Fills from 0→100% over COOLDOWN_MS after a tile is captured.
 * Uses requestAnimationFrame for smooth animation (avoids setState thrash).
 *
 * Also listens for the 'cooldown-shake' custom event dispatched by Tile.jsx
 * when the user clicks during an active cooldown.
 */
export default function CooldownBar() {
  const cooldownUntil = useStore((s) => s.cooldownUntil);
  const user = useStore((s) => s.user);
  const [progress, setProgress] = useState(0);
  const [shake, setShake] = useState(false);
  const rafRef = useRef(null);

  // Animate progress bar
  useEffect(() => {
    if (!cooldownUntil) {
      setProgress(0);
      return;
    }

    const startTime = Date.now();
    const duration = COOLDOWN_MS;

    function tick() {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);

      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [cooldownUntil]);

  // Listen for shake events from Tile clicks during cooldown
  useEffect(() => {
    function onShake() {
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
    window.addEventListener('cooldown-shake', onShake);
    return () => window.removeEventListener('cooldown-shake', onShake);
  }, []);

  const isActive = cooldownUntil && Date.now() < cooldownUntil;
  const isReady = progress >= 100 || !isActive;
  const color = user?.color || 'var(--accent)';

  return (
    <div
      className="cooldown-bar-wrap area-coolbar"
      style={{
        transform: shake ? 'translateX(4px)' : 'translateX(0)',
        transition: shake ? 'transform 0.05s ease' : 'transform 0.1s ease',
      }}
    >
      {isActive ? (
        <div
          className="cooldown-bar-fill"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            boxShadow: `0 0 8px ${color}66`,
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: `${color}22`,
            transition: 'background 0.3s ease',
          }}
        />
      )}

      {isReady && user && (
        <span
          className="cooldown-ready"
          style={{
            animation: 'pulse-dot 1.5s ease-in-out infinite',
            color: 'var(--success)',
          }}
        >
          READY
        </span>
      )}
    </div>
  );
}
