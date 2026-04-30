import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSocket } from './hooks/useSocket';
import useStore from './store/useStore';
import Header from './components/Header';
import Grid from './components/Grid';
import Leaderboard from './components/Leaderboard';
import CooldownBar from './components/CooldownBar';
import UsernameModal from './components/UsernameModal';
import Toast from './components/Toast';
import ActivityFeed from './components/ActivityFeed';

/**
 * App — Root component
 *
 * Responsibilities:
 *  1. Initialize Socket.io connection
 *  2. Show UsernameModal if user hasn't joined
 *  3. Render the full layout once joined
 *  4. Show loading screen while grid is fetching
 *  5. Show error banner if disconnected
 *
 * Layout:
 *   Header (full width)
 *   Grid (left, fills space) | Sidebar: Leaderboard + ActivityFeed (right)
 *   CooldownBar (full width, bottom)
 */

// Simple class-based error boundary for React 18
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', gap: '12px',
          background: 'var(--bg-primary)', color: 'var(--danger)',
          fontFamily: 'var(--font-mono)',
        }}>
          <div style={{ fontSize: '20px', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            SYSTEM ERROR
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {this.state.error?.message || 'Unknown error'}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '8px', padding: '8px 16px',
              background: 'var(--danger)', color: '#fff',
              border: 'none', borderRadius: '4px', cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppInner() {
  const { isConnected } = useSocket();
  const isLoading = useStore((s) => s.isLoading);
  const user = useStore((s) => s.user);

  // Show modal if no user in localStorage and not yet joined
  const [showModal, setShowModal] = useState(() => {
    const saved = localStorage.getItem('territoria_user');
    return !saved;
  });

  // Once socket assigns us a user, hide the modal
  useEffect(() => {
    if (user) setShowModal(false);
  }, [user]);

  const handleJoin = () => {
    // Modal hides after socket 'joined' event sets user in store
    // But also hide it immediately for snappy UX
    setShowModal(false);
  };

  return (
    <>
      {/* Loading screen */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            className="loading-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="loading-logo">
              TERRI<span>TORIA</span>
            </div>
            <div className="loading-bar">
              <div className="loading-bar-fill" />
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '2px' }}>
              LOADING GRID…
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Disconnection banner */}
      <AnimatePresence>
        {!isConnected && !isLoading && (
          <motion.div
            className="error-banner"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', display: 'inline-block' }} />
            Disconnected — reconnecting…
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main layout */}
      <div className="app-layout">
        <Header />

        <main className="area-grid">
          <Grid />
        </main>

        <aside className="area-sidebar sidebar">
          <Leaderboard />
          <ActivityFeed />
        </aside>

        <CooldownBar />
      </div>

      {/* Username modal */}
      <AnimatePresence>
        {showModal && (
          <UsernameModal key="modal" onJoin={handleJoin} />
        )}
      </AnimatePresence>

      {/* Toast notifications */}
      <Toast />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
