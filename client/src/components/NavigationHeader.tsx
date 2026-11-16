import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  MousePointer,
  Compass,
  LayoutGrid,
  Settings,
  Maximize,
  Minimize,
  Wifi,
  WifiOff,
  Crosshair,
  Sun,
  Moon
} from 'lucide-react';
import type { ControllerMode, ConnectionStatus } from '../types/controller';
import { haptics } from '../services/hapticsService';

interface NavigationHeaderProps {
  currentMode: ControllerMode;
  onSelectMode: (mode: ControllerMode) => void;
  connectionStatus: ConnectionStatus;
  onOpenSettings: () => void;
  onCalibrateGyro?: () => void;
  gyroSupported?: boolean;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  currentMode,
  onSelectMode,
  connectionStatus,
  onOpenSettings,
  onCalibrateGyro,
  gyroSupported = false,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [wakeLockSentinel, setWakeLockSentinel] = useState<WakeLockSentinel | null>(null);

  // Toggle fullscreen
  const toggleFullscreen = async () => {
    haptics.impactLight();
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Fullscreen error:', err);
    }
  };

  // Toggle wake lock to keep screen awake during gaming
  const toggleWakeLock = async () => {
    haptics.impactLight();
    if (wakeLockActive && wakeLockSentinel) {
      try {
        await wakeLockSentinel.release();
        setWakeLockSentinel(null);
        setWakeLockActive(false);
      } catch (err) {
        console.warn('Wake lock release error:', err);
      }
    } else if ('wakeLock' in navigator) {
      try {
        const sentinel = await navigator.wakeLock.request('screen');
        sentinel.addEventListener('release', () => {
          setWakeLockActive(false);
          setWakeLockSentinel(null);
        });
        setWakeLockSentinel(sentinel);
        setWakeLockActive(true);
      } catch (err) {
        console.warn('Wake lock request error:', err);
      }
    }
  };

  // Clean up wake lock on unmount
  useEffect(() => {
    return () => {
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
      }
    };
  }, [wakeLockSentinel]);

  // Connection status color & text
  const isConnected = connectionStatus.state === 'connected';
  const isConnecting = connectionStatus.state === 'connecting';

  const statusColor = isConnected
    ? 'var(--accent-primary)'
    : isConnecting
    ? '#eab308'
    : '#ef4444';

  const navItems: { mode: ControllerMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'gamepad', label: 'Gamepad', icon: <Gamepad2 size={18} /> },
    { mode: 'trackpad', label: 'Trackpad', icon: <MousePointer size={18} /> },
    { mode: 'gyro', label: 'Gyro', icon: <Compass size={18} /> },
    { mode: 'macro', label: 'Macro Deck', icon: <LayoutGrid size={18} /> },
  ];

  return (
    <header style={styles.header}>
      {/* Brand & Connection Status Badge */}
      <div style={styles.leftSection}>
        <div style={styles.brandContainer}>
          <span style={styles.brandTitle}>ZeroAxisPad</span>
          <span style={styles.brandBadge}>PRO</span>
        </div>

        {/* Latency & Connectivity HUD Badge */}
        <button
          style={{
            ...styles.statusBadge,
            borderColor: statusColor,
            background: isConnected ? 'var(--accent-subtle)' : 'rgba(239, 68, 68, 0.08)',
          }}
          onClick={onOpenSettings}
          title="Click to configure Host IP / Connection"
        >
          {isConnected ? (
            <Wifi size={14} color={statusColor} />
          ) : (
            <WifiOff size={14} color={statusColor} />
          )}
          <span style={{ ...styles.statusText, color: statusColor }}>
            {isConnected
              ? `${connectionStatus.rtt}ms`
              : isConnecting
              ? 'Connecting...'
              : 'Offline'}
          </span>
        </button>
      </div>

      {/* Mode Navigation Tabs */}
      <nav style={styles.navTabs}>
        {navItems.map((item) => {
          const active = currentMode === item.mode;
          return (
            <button
              key={item.mode}
              style={{
                ...styles.navButton,
                ...(active ? styles.navButtonActive : {}),
              }}
              onClick={() => {
                haptics.impactLight();
                onSelectMode(item.mode);
              }}
            >
              <span style={{ color: active ? 'var(--accent-primary)' : 'inherit' }}>
                {item.icon}
              </span>
              <span style={styles.navLabel}>{item.label}</span>
              {active && <div style={styles.activeIndicator} />}
            </button>
          );
        })}
      </nav>

      {/* Action Controls: Gyro Zero, Screen Wake, Fullscreen, Settings */}
      <div style={styles.rightSection}>
        {gyroSupported && onCalibrateGyro && (
          <button
            style={styles.iconButton}
            onClick={() => {
              haptics.impactMedium();
              onCalibrateGyro();
            }}
            title="Calibrate Gyro / Center Zero"
          >
            <Crosshair size={18} />
          </button>
        )}

        {'wakeLock' in navigator && (
          <button
            style={{
              ...styles.iconButton,
              color: wakeLockActive ? 'var(--accent-primary)' : 'var(--text-muted)',
            }}
            onClick={toggleWakeLock}
            title={wakeLockActive ? 'Screen WakeLock ON' : 'Keep Screen Awake'}
          >
            {wakeLockActive ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        )}

        <button
          style={styles.iconButton}
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>

        <button
          style={styles.iconButton}
          onClick={() => {
            haptics.impactLight();
            onOpenSettings();
          }}
          title="Open Settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
};

const styles: Record<string, React.CSSProperties> = {
  header: {
    height: '48px',
    backgroundColor: 'var(--bg-surface)',
    borderBottom: '1px solid var(--border-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px',
    zIndex: 100,
    flexShrink: 0,
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  brandContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  brandTitle: {
    fontSize: '15px',
    fontWeight: 700,
    letterSpacing: '-0.3px',
    color: 'var(--text-primary)',
  },
  brandBadge: {
    fontSize: '9px',
    fontWeight: 800,
    letterSpacing: '0.5px',
    color: 'var(--accent-primary)',
    background: 'var(--accent-dim)',
    padding: '1px 5px',
    borderRadius: '4px',
    border: '1px solid var(--accent-border)',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '3px 8px',
    borderRadius: '12px',
    border: '1px solid',
    fontSize: '11px',
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  statusText: {
    lineHeight: 1,
  },
  navTabs: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    height: '100%',
  },
  navButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '6px',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    fontWeight: 500,
    position: 'relative',
    height: '36px',
    transition: 'all 0.15s ease',
  },
  navButtonActive: {
    color: 'var(--text-primary)',
    background: 'var(--accent-dim)',
  },
  navLabel: {
    display: 'inline-block',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: '-6px',
    left: '12px',
    right: '12px',
    height: '2px',
    backgroundColor: 'var(--accent-primary)',
    borderRadius: '2px',
    boxShadow: '0 0 8px var(--accent-glow)',
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  iconButton: {
    width: '34px',
    height: '34px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    color: 'var(--text-secondary)',
    transition: 'all 0.15s',
  },
};
