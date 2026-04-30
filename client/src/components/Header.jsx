import React from 'react';
import useStore from '../store/useStore';
import OnlineCounter from './OnlineCounter';

/**
 * Header — Top navigation bar
 *
 * Contains: TERRITORIA logo, your territory stats, your color swatch,
 * and the online users counter.
 */
export default function Header() {
  const user = useStore((s) => s.user);
  const grid = useStore((s) => s.grid);

  // Count tiles owned by current user
  const myTileCount = user
    ? Object.values(grid).filter((t) => t.owner === user.id).length
    : 0;
  const pct = ((myTileCount / 2500) * 100).toFixed(1);

  return (
    <header className="header area-header">
      {/* Logo */}
      <div className="header-logo">
        TERRI<span>TORIA</span>
      </div>

      {/* Right side */}
      <div className="header-right">
        {/* Online counter */}
        <OnlineCounter />

        {/* My stats (only shown after join) */}
        {user && (
          <>
            <div className="my-stats">
              <span>You own</span>
              <span className="my-stats-count">{myTileCount}</span>
              <span>tiles</span>
              <span style={{ color: 'var(--text-muted)' }}>({pct}%)</span>
            </div>

            {/* Color swatch */}
            <div
              className="my-color-swatch"
              style={{
                backgroundColor: user.color,
                boxShadow: `0 0 8px ${user.color}88`,
              }}
              title={`Your color: ${user.color}`}
            />
          </>
        )}
      </div>
    </header>
  );
}
