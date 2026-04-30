import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PRESET_COLORS, generateColor } from '../utils/colorUtils';
import { getSocket } from '../hooks/useSocket';
import useStore from '../store/useStore';

/**
 * UsernameModal — First-visit name + color selection screen
 *
 * Shown when localStorage has no saved user.
 * On submit:
 *  1. Saves { username, color } to localStorage
 *  2. Emits 'join' to the server via socket
 *  3. Modal fades out
 *
 * The server will respond with 'joined' event, which sets the user in store.
 */
export default function UsernameModal({ onJoin }) {
  const [username, setUsername] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  function handleRandomColor() {
    const random = generateColor(Math.random().toString());
    setSelectedColor(random);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      setError('Please enter a username');
      inputRef.current?.focus();
      return;
    }
    if (trimmed.length > 20) {
      setError('Max 20 characters');
      return;
    }

    // Persist locally
    localStorage.setItem('territoria_user', JSON.stringify({ username: trimmed, color: selectedColor }));

    // Emit join to server
    const socket = getSocket();
    if (socket) {
      socket.emit('join', { username: trimmed, color: selectedColor });
    }

    onJoin();
  }

  return (
    <div className="modal-backdrop">
      <motion.div
        className="modal-box"
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Title */}
        <div className="modal-title">
          TERRI<span>TORIA</span>
        </div>
        <div className="modal-subtitle">
          Claim tiles. Dominate the grid. Leave your mark.
        </div>

        <form onSubmit={handleSubmit}>
          {/* Username input */}
          <div style={{ marginBottom: '20px' }}>
            <label className="form-label">Your Callsign</label>
            <input
              ref={inputRef}
              className="form-input"
              type="text"
              placeholder="Enter username…"
              value={username}
              maxLength={20}
              autoFocus
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
            />
            {error && (
              <div style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '4px' }}>
                {error}
              </div>
            )}
          </div>

          {/* Color picker */}
          <div>
            <label className="form-label">
              Choose Your Color
              <span
                style={{ cursor: 'pointer', color: 'var(--text-muted)', marginLeft: '8px', fontSize: '10px' }}
                onClick={handleRandomColor}
              >
                [random]
              </span>
            </label>
            <div className="color-picker-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-swatch-btn${selectedColor === color ? ' selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                  aria-label={`Select color ${color}`}
                />
              ))}
              {/* Custom color preview (if random was picked) */}
              {!PRESET_COLORS.includes(selectedColor) && (
                <div
                  className="color-swatch-btn selected"
                  style={{ backgroundColor: selectedColor }}
                />
              )}
            </div>
          </div>

          {/* Preview */}
          <div style={{
            marginTop: '20px',
            padding: '10px 12px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '4px',
                backgroundColor: selectedColor,
                boxShadow: `0 0 10px ${selectedColor}88`,
                flexShrink: 0,
                border: '2px solid rgba(255,255,255,0.15)',
              }}
            />
            <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
              Playing as{' '}
              <span style={{ color: selectedColor, fontWeight: 700 }}>
                {username.trim() || 'Anonymous'}
              </span>
            </span>
          </div>

          <button type="submit" className="btn-primary" disabled={!username.trim()}>
            Enter the Grid →
          </button>
        </form>
      </motion.div>
    </div>
  );
}
