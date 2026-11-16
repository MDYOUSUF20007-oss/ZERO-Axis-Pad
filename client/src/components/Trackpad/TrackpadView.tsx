import React, { useState, useRef, useEffect } from 'react';
import {
  MousePointer2,
  Compass,
  Lock,
  Unlock,
  MoveVertical,
  Sliders,
} from 'lucide-react';
import type { ControllerSettings, MotionData } from '../../types/controller';
import { networkService } from '../../services/networkService';
import { haptics } from '../../services/hapticsService';

interface TrackpadViewProps {
  settings: ControllerSettings;
  motion: MotionData;
  onUpdateSettings: (settings: Partial<ControllerSettings>) => void;
}

export const TrackpadView: React.FC<TrackpadViewProps> = ({
  settings,
  motion,
  onUpdateSettings,
}) => {
  const [isAirMouseMode, setIsAirMouseMode] = useState(false);
  const [airMouseEngaged, setAirMouseEngaged] = useState(false);
  const [dragLocked, setDragLocked] = useState(false);
  const [leftBtnDown, setLeftBtnDown] = useState(false);
  const [rightBtnDown, setRightBtnDown] = useState(false);
  const [middleBtnDown, setMiddleBtnDown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const surfaceRef = useRef<HTMLDivElement>(null);

  // Multi-touch tracking refs
  const touchMapRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const touchStartTimesRef = useRef<Map<number, number>>(new Map());
  const initialPinchDistRef = useRef<number | null>(null);
  const hasMovedRef = useRef<boolean>(false);

  // Air mouse gyro delta tracking
  const lastGyroRef = useRef<{ pitch: number; yaw: number } | null>(null);

  // Handle Air Mouse gyro delta when engaged
  useEffect(() => {
    if (!isAirMouseMode || !airMouseEngaged) {
      lastGyroRef.current = null;
      return;
    }

    if (lastGyroRef.current === null) {
      lastGyroRef.current = { pitch: motion.pitch, yaw: motion.yaw };
      return;
    }

    // Calculate gyro deltas
    let dYaw = motion.yaw - lastGyroRef.current.yaw;
    let dPitch = motion.pitch - lastGyroRef.current.pitch;

    // Handle 360 wrap on yaw
    if (dYaw > 180) dYaw -= 360;
    if (dYaw < -180) dYaw += 360;

    lastGyroRef.current = { pitch: motion.pitch, yaw: motion.yaw };

    // Threshold deadzone
    if (Math.abs(dYaw) > 0.05 || Math.abs(dPitch) > 0.05) {
      const sens = settings.airMouseSensitivity * 18;
      // Invert yaw to match screen X, pitch to screen Y
      const dx = dYaw * sens;
      const dy = -dPitch * sens;

      networkService.sendMouseMove(dx, dy);
    }
  }, [isAirMouseMode, airMouseEngaged, motion.pitch, motion.yaw, settings.airMouseSensitivity]);

  // Touch event handlers for trackpad
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const now = Date.now();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      touchMapRef.current.set(t.identifier, { x: t.clientX, y: t.clientY });
      touchStartTimesRef.current.set(t.identifier, now);
    }

    hasMovedRef.current = false;

    // Check pinch initial distance
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialPinchDistRef.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const touches = e.touches;

    if (touches.length === 1) {
      // Single finger cursor movement
      const t = touches[0];
      const prev = touchMapRef.current.get(t.identifier);

      if (prev) {
        const dx = (t.clientX - prev.x) * settings.trackpadSensitivity;
        const dy = (t.clientY - prev.y) * settings.trackpadSensitivity;

        if (Math.hypot(dx, dy) > 1.2) {
          hasMovedRef.current = true;
          networkService.sendMouseMove(dx, dy);
          touchMapRef.current.set(t.identifier, { x: t.clientX, y: t.clientY });
        }
      }
    } else if (touches.length === 2) {
      // Two finger scroll or pinch zoom
      const t1 = touches[0];
      const t2 = touches[1];
      const prev1 = touchMapRef.current.get(t1.identifier);
      const prev2 = touchMapRef.current.get(t2.identifier);

      if (prev1 && prev2) {
        const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

        // Check if pinch zoom
        if (initialPinchDistRef.current && Math.abs(currentDist - initialPinchDistRef.current) > 20) {
          const deltaDist = currentDist - initialPinchDistRef.current;
          // Zoom in / out (Ctrl + scroll)
          networkService.sendMouseScroll(0, deltaDist > 0 ? 120 : -120);
          initialPinchDistRef.current = currentDist;
        } else {
          // Two finger drag scroll
          const dy1 = t1.clientY - prev1.y;
          const dy2 = t2.clientY - prev2.y;
          const avgDy = (dy1 + dy2) / 2;

          const dx1 = t1.clientX - prev1.x;
          const dx2 = t2.clientX - prev2.x;
          const avgDx = (dx1 + dx2) / 2;

          if (Math.abs(avgDy) > 2 || Math.abs(avgDx) > 2) {
            hasMovedRef.current = true;
            // Scroll inverted like natural scrolling
            networkService.sendMouseScroll(avgDx * -4, avgDy * -4);
          }
        }

        touchMapRef.current.set(t1.identifier, { x: t1.clientX, y: t1.clientY });
        touchMapRef.current.set(t2.identifier, { x: t2.clientX, y: t2.clientY });
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    const now = Date.now();

    // Check taps if user did not drag
    if (!hasMovedRef.current) {
      if (touchMapRef.current.size === 1) {
        // 1 finger tap = Left Click
        const touch = e.changedTouches[0];
        const startTime = touchStartTimesRef.current.get(touch.identifier) || now;
        if (now - startTime < 300) {
          haptics.impactLight();
          networkService.sendMouseButton('left', 'click');
        }
      } else if (touchMapRef.current.size === 2) {
        // 2 finger tap = Right Click
        haptics.impactMedium();
        networkService.sendMouseButton('right', 'click');
      }
    }

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      touchMapRef.current.delete(t.identifier);
      touchStartTimesRef.current.delete(t.identifier);
    }

    if (e.touches.length < 2) {
      initialPinchDistRef.current = null;
    }
  };

  // Button clicks
  const handleLeftClick = (down: boolean) => {
    if (dragLocked) return;
    setLeftBtnDown(down);
    haptics.impactLight();
    networkService.sendMouseButton('left', down ? 'down' : 'up');
  };

  const handleRightClick = (down: boolean) => {
    setRightBtnDown(down);
    haptics.impactLight();
    networkService.sendMouseButton('right', down ? 'down' : 'up');
  };

  const handleMiddleClick = (down: boolean) => {
    setMiddleBtnDown(down);
    haptics.impactLight();
    networkService.sendMouseButton('middle', down ? 'down' : 'up');
  };

  const toggleDragLock = () => {
    haptics.impactHeavy();
    const next = !dragLocked;
    setDragLocked(next);
    setLeftBtnDown(next);
    networkService.sendMouseButton('left', next ? 'down' : 'up');
  };

  return (
    <div style={styles.container}>
      {/* Top Controls: Mode Switch & Sensitivity */}
      <div style={styles.topBar}>
        <div style={styles.modeToggleGroup}>
          <button
            style={{
              ...styles.modeBtn,
              backgroundColor: !isAirMouseMode ? 'var(--accent-primary)' : 'var(--bg-elevated)',
              color: !isAirMouseMode ? '#000' : 'var(--text-secondary)',
            }}
            onClick={() => {
              haptics.impactLight();
              setIsAirMouseMode(false);
            }}
          >
            <MousePointer2 size={14} />
            <span>Trackpad</span>
          </button>

          <button
            style={{
              ...styles.modeBtn,
              backgroundColor: isAirMouseMode ? 'var(--accent-primary)' : 'var(--bg-elevated)',
              color: isAirMouseMode ? '#000' : 'var(--text-secondary)',
            }}
            onClick={() => {
              haptics.impactLight();
              setIsAirMouseMode(true);
            }}
          >
            <Compass size={14} />
            <span>Air Mouse (Gyro)</span>
          </button>
        </div>

        <button
          style={styles.iconBtn}
          onClick={() => setShowSettings((p) => !p)}
          title="Sensitivity Settings"
        >
          <Sliders size={16} />
        </button>
      </div>

      {/* Sensitivity Settings Drawer */}
      {showSettings && (
        <div style={styles.settingsDrawer}>
          <div style={styles.settingRow}>
            <span style={styles.settingLabel}>Trackpad Sensitivity</span>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={settings.trackpadSensitivity}
              onChange={(e) => onUpdateSettings({ trackpadSensitivity: parseFloat(e.target.value) })}
              style={styles.slider}
            />
            <span style={styles.settingVal}>{settings.trackpadSensitivity}x</span>
          </div>

          <div style={styles.settingRow}>
            <span style={styles.settingLabel}>Air Mouse Sensitivity</span>
            <input
              type="range"
              min="0.4"
              max="3.0"
              step="0.1"
              value={settings.airMouseSensitivity}
              onChange={(e) => onUpdateSettings({ airMouseSensitivity: parseFloat(e.target.value) })}
              style={styles.slider}
            />
            <span style={styles.settingVal}>{settings.airMouseSensitivity}x</span>
          </div>
        </div>
      )}

      {/* Main Surface Area */}
      {!isAirMouseMode ? (
        <div
          ref={surfaceRef}
          style={styles.trackpadSurface}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          {/* Subtle guide watermark */}
          <div style={styles.surfaceWatermark}>
            <MousePointer2 size={36} color="var(--border-light)" />
            <span style={styles.watermarkText}>Tap = Left Click &bull; 2-Finger Tap = Right Click</span>
            <span style={styles.watermarkSubtext}>2-Finger Drag = Scroll &bull; Pinch = Zoom</span>
          </div>
        </div>
      ) : (
        /* Air Mouse Gyro Screen */
        <div style={styles.airMouseSurface}>
          <div style={styles.airMouseHud}>
            <Compass size={48} color="var(--accent-primary)" className="glow-accent" />
            <span style={styles.airMouseTitle}>Air Mouse Active</span>
            <span style={styles.airMouseSubtitle}>
              Tilt and wave your phone in the air to point.
            </span>
          </div>

          {/* Clutch / Pointer Deadman Button */}
          <button
            style={{
              ...styles.clutchButton,
              backgroundColor: airMouseEngaged ? 'var(--accent-primary)' : 'var(--bg-elevated)',
              color: airMouseEngaged ? '#000' : 'var(--accent-primary)',
              borderColor: 'var(--accent-border)',
              boxShadow: airMouseEngaged ? '0 0 24px var(--accent-glow)' : 'var(--shadow-md)',
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              haptics.impactMedium();
              setAirMouseEngaged(true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              setAirMouseEngaged(false);
            }}
            onMouseDown={() => {
              haptics.impactMedium();
              setAirMouseEngaged(true);
            }}
            onMouseUp={() => setAirMouseEngaged(false)}
          >
            <span style={styles.clutchText}>
              {airMouseEngaged ? 'POINTER ENGAGED' : 'HOLD TO AIM / POINT'}
            </span>
            <span style={styles.clutchSubtext}>Release to reposition hand</span>
          </button>
        </div>
      )}

      {/* Dedicated Bottom Mouse Buttons */}
      <div style={styles.mouseButtonBar}>
        {/* Left Click */}
        <button
          style={{
            ...styles.mouseBtn,
            ...styles.mouseBtnLeft,
            backgroundColor: leftBtnDown ? 'var(--accent-primary)' : 'var(--bg-elevated)',
            color: leftBtnDown ? '#000' : 'var(--text-primary)',
            borderColor: leftBtnDown ? 'var(--accent-primary)' : 'var(--border-light)',
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            handleLeftClick(true);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleLeftClick(false);
          }}
          onMouseDown={() => handleLeftClick(true)}
          onMouseUp={() => handleLeftClick(false)}
        >
          <span>LEFT CLICK</span>
        </button>

        {/* Drag Lock Toggle */}
        <button
          style={{
            ...styles.utilityBtn,
            backgroundColor: dragLocked ? 'var(--accent-dim)' : 'var(--bg-elevated)',
            color: dragLocked ? 'var(--accent-primary)' : 'var(--text-muted)',
            borderColor: dragLocked ? 'var(--accent-primary)' : 'var(--border-light)',
          }}
          onClick={toggleDragLock}
          title={dragLocked ? 'Drag Lock Active' : 'Lock Drag'}
        >
          {dragLocked ? <Lock size={16} /> : <Unlock size={16} />}
        </button>

        {/* Middle Click */}
        <button
          style={{
            ...styles.utilityBtn,
            backgroundColor: middleBtnDown ? 'var(--accent-dim)' : 'var(--bg-elevated)',
            color: middleBtnDown ? 'var(--accent-primary)' : 'var(--text-muted)',
            borderColor: middleBtnDown ? 'var(--accent-primary)' : 'var(--border-light)',
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            handleMiddleClick(true);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleMiddleClick(false);
          }}
          onMouseDown={() => handleMiddleClick(true)}
          onMouseUp={() => handleMiddleClick(false)}
          title="Middle Mouse Click"
        >
          <MoveVertical size={16} />
        </button>

        {/* Right Click */}
        <button
          style={{
            ...styles.mouseBtn,
            ...styles.mouseBtnRight,
            backgroundColor: rightBtnDown ? 'var(--accent-primary)' : 'var(--bg-elevated)',
            color: rightBtnDown ? '#000' : 'var(--text-primary)',
            borderColor: rightBtnDown ? 'var(--accent-primary)' : 'var(--border-light)',
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            handleRightClick(true);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleRightClick(false);
          }}
          onMouseDown={() => handleRightClick(true)}
          onMouseUp={() => handleRightClick(false)}
        >
          <span>RIGHT CLICK</span>
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-primary)',
    userSelect: 'none',
    touchAction: 'none',
    overflow: 'hidden',
    padding: '8px',
    gap: '8px',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px',
  },
  modeToggleGroup: {
    display: 'flex',
    backgroundColor: 'var(--bg-surface)',
    borderRadius: '8px',
    padding: '3px',
    gap: '4px',
    border: '1px solid var(--border-light)',
  },
  modeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  iconBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    backgroundColor: 'var(--bg-elevated)',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid var(--border-light)',
  },
  settingsDrawer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '10px 14px',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    border: '1px solid var(--border-light)',
  },
  settingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  settingLabel: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    minWidth: '135px',
  },
  slider: {
    flex: 1,
    accentColor: 'var(--accent-primary)',
    height: '4px',
    cursor: 'pointer',
  },
  settingVal: {
    fontSize: '12px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent-primary)',
    minWidth: '32px',
    textAlign: 'right',
  },
  trackpadSurface: {
    flex: 1,
    backgroundColor: 'var(--bg-trackpad)',
    borderRadius: '12px',
    border: '1.5px solid var(--border-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    touchAction: 'none',
    cursor: 'crosshair',
    overflow: 'hidden',
  },
  surfaceWatermark: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    pointerEvents: 'none',
    opacity: 0.6,
  },
  watermarkText: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  watermarkSubtext: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  airMouseSurface: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: '16px',
    borderRadius: '12px',
    backgroundColor: 'var(--bg-trackpad)',
    border: '1.5px solid var(--border-light)',
  },
  airMouseHud: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  airMouseTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  airMouseSubtitle: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    textAlign: 'center',
  },
  clutchButton: {
    width: '100%',
    maxWidth: '320px',
    height: '90px',
    borderRadius: '16px',
    border: '2px solid',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    cursor: 'pointer',
    touchAction: 'none',
    userSelect: 'none',
    transition: 'all 0.1s ease',
  },
  clutchText: {
    fontSize: '15px',
    fontWeight: 800,
    letterSpacing: '1px',
  },
  clutchSubtext: {
    fontSize: '11px',
    opacity: 0.75,
  },
  mouseButtonBar: {
    display: 'flex',
    height: '60px',
    gap: '8px',
  },
  mouseBtn: {
    flex: 1,
    borderRadius: '10px',
    border: '1.5px solid',
    fontSize: '13px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    cursor: 'pointer',
    touchAction: 'none',
    userSelect: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mouseBtnLeft: {
    borderTopLeftRadius: '10px',
  },
  mouseBtnRight: {
    borderTopRightRadius: '10px',
  },
  utilityBtn: {
    width: '50px',
    borderRadius: '10px',
    border: '1.5px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    touchAction: 'none',
    userSelect: 'none',
  },
};
