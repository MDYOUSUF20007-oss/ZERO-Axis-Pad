import React, { useRef, useState, useCallback, useEffect } from 'react';
import { haptics } from '../../services/hapticsService';

interface VirtualJoystickProps {
  label: string;
  size?: number; // base diameter in px (default 160)
  knobSize?: number; // knob diameter in px (default 65)
  deadzone?: number; // normalized deadzone (default 0.08)
  onChange: (x: number, y: number) => void;
  onClickStick?: () => void; // L3/R3 click
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  label,
  size = 150,
  knobSize = 60,
  deadzone = 0.08,
  onChange,
  onClickStick,
}) => {
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);
  const touchIdRef = useRef<number | null>(null);
  const baseRef = useRef<HTMLDivElement>(null);
  const lastNormalizedRef = useRef({ x: 0, y: 0 });
  const lastTapTimeRef = useRef<number>(0);

  const maxRadius = (size - knobSize) / 2;

  // Process coordinates relative to center
  const handlePosition = useCallback(
    (clientX: number, clientY: number) => {
      if (!baseRef.current) return;
      const rect = baseRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = clientX - centerX;
      let dy = clientY - centerY;

      const distance = Math.hypot(dx, dy);

      if (distance > maxRadius) {
        const angle = Math.atan2(dy, dx);
        dx = Math.cos(angle) * maxRadius;
        dy = Math.sin(angle) * maxRadius;
      }

      setKnobPos({ x: dx, y: dy });

      // Normalized [-1.0, 1.0]
      let normX = dx / maxRadius;
      let normY = dy / maxRadius;

      // Apply deadzone
      const normDist = Math.hypot(normX, normY);
      if (normDist < deadzone) {
        normX = 0;
        normY = 0;
      }

      // Invert Y so up is -1 (or game standard: up is -1 for screens, normalized)
      lastNormalizedRef.current = { x: normX, y: normY };
      onChange(normX, normY);
    },
    [maxRadius, deadzone, onChange]
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    setIsActive(true);
    haptics.impactLight();

    // Check double tap for L3/R3
    const now = Date.now();
    if (now - lastTapTimeRef.current < 260) {
      haptics.impactHeavy();
      if (onClickStick) onClickStick();
    }
    lastTapTimeRef.current = now;

    handlePosition(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        handlePosition(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setIsActive(false);
        setKnobPos({ x: 0, y: 0 });
        lastNormalizedRef.current = { x: 0, y: 0 };
        onChange(0, 0);
        break;
      }
    }
  };

  // Mouse emulation for desktop testing
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsActive(true);
    haptics.impactLight();
    handlePosition(e.clientX, e.clientY);

    const onMouseMove = (moveEvent: MouseEvent) => {
      handlePosition(moveEvent.clientX, moveEvent.clientY);
    };

    const onMouseUp = () => {
      setIsActive(false);
      setKnobPos({ x: 0, y: 0 });
      onChange(0, 0);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Clean up if component unmounts while touching
  useEffect(() => {
    return () => {
      touchIdRef.current = null;
    };
  }, []);

  return (
    <div style={styles.container}>
      <div
        ref={baseRef}
        style={{
          ...styles.base,
          width: `${size}px`,
          height: `${size}px`,
          borderColor: isActive ? 'var(--accent-primary)' : 'var(--border-light)',
          boxShadow: isActive ? '0 0 16px var(--accent-glow)' : 'var(--shadow-md)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        {/* Cardinal Guide Crosshairs */}
        <div style={styles.crosshairH} />
        <div style={styles.crosshairV} />
        <div style={styles.centerTarget} />

        {/* Joystick Thumb Knob - Xbox Concave Dish Styling */}
        <div
          style={{
            ...styles.knob,
            width: `${knobSize}px`,
            height: `${knobSize}px`,
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            borderColor: isActive ? 'var(--accent-primary)' : 'rgba(255,255,255,0.22)',
            background: isActive ? 'var(--bg-joystick-knob)' : 'radial-gradient(circle at 40% 40%, #323b49 0%, #1a2029 65%, #10141a 100%)',
            boxShadow: isActive
              ? '0 6px 18px rgba(0,0,0,0.8), 0 0 16px var(--accent-glow), inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 6px rgba(0,0,0,0.8)'
              : '0 4px 12px rgba(0,0,0,0.7), inset 0 1px 2px rgba(255,255,255,0.2), inset 0 -2px 6px rgba(0,0,0,0.8)',
          }}
        >
          {/* Xbox Concave Inner Ring & Grip Nubs */}
          <div style={styles.knobInnerDish}>
            <div
              style={{
                ...styles.knobCenterDot,
                backgroundColor: isActive ? 'var(--accent-primary)' : 'rgba(255,255,255,0.25)',
                boxShadow: isActive ? '0 0 8px var(--accent-glow)' : 'none',
              }}
            />
          </div>
        </div>
      </div>
      <span style={styles.label}>{label}</span>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    userSelect: 'none',
    touchAction: 'none',
  },
  base: {
    borderRadius: '50%',
    backgroundColor: 'var(--bg-joystick-base)',
    border: '2px solid',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    touchAction: 'none',
    userSelect: 'none',
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  crosshairH: {
    position: 'absolute',
    left: '12%',
    right: '12%',
    height: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    pointerEvents: 'none',
  },
  crosshairV: {
    position: 'absolute',
    top: '12%',
    bottom: '12%',
    width: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    pointerEvents: 'none',
  },
  centerTarget: {
    position: 'absolute',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    border: '1px dashed rgba(255, 255, 255, 0.12)',
    pointerEvents: 'none',
  },
  knob: {
    borderRadius: '50%',
    border: '2px solid',
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    transition: 'transform 0.02s linear, border-color 0.15s',
    willChange: 'transform',
  },
  knobInnerDish: {
    width: '74%',
    height: '74%',
    borderRadius: '50%',
    border: '1.5px solid rgba(255, 255, 255, 0.15)',
    boxShadow: 'inset 0 3px 6px rgba(0, 0, 0, 0.8), 0 1px 2px rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at 50% 50%, #151a22 0%, #10141a 100%)',
  },
  knobCenterDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    transition: 'background-color 0.15s, box-shadow 0.15s',
  },
  label: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.8px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
};
