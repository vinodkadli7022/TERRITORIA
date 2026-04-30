import React, { useEffect, useMemo, useCallback } from 'react';
import useStore from '../store/useStore';
import Tile from './Tile';

const GRID_SIZE = 50;

/**
 * Grid — Main 50×50 board renderer
 *
 * Performance approach:
 *  - Flat array of 2500 tile indices computed once with useMemo
 *  - Each <Tile> is a memo'd component — only re-renders when its data changes
 *  - Grid reads from Zustand's `grid` map (keyed "x_y")
 *
 * On mount: fetches /api/grid and populates the store.
 * After that, all updates come through socket events (no polling).
 */
export default function Grid() {
  const { grid, user, setGrid, setIsLoading } = useStore();

  // Fetch full grid on mount
  useEffect(() => {
    async function fetchGrid() {
      try {
        const res = await fetch('/api/grid');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { tiles } = await res.json();
        setGrid(tiles);
      } catch (err) {
        console.warn('Failed to fetch grid via REST, waiting for socket init:', err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchGrid();
  }, []);

  // Flat array of [x, y] pairs, computed once
  const cells = useMemo(() => {
    const arr = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        arr.push({ x, y });
      }
    }
    return arr;
  }, []);

  return (
    <div className="grid-wrapper">
      <div className="grid-container">
        {cells.map(({ x, y }) => {
          const key = `${x}_${y}`;
          const tileData = grid[key] || null;
          const isOwned = !!(user && tileData && tileData.owner === user.id);

          return (
            <Tile
              key={key}
              x={x}
              y={y}
              tileData={tileData}
              isOwned={isOwned}
            />
          );
        })}
      </div>
    </div>
  );
}
