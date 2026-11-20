import React, { useRef, useState, useCallback } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { haptics } from '../../services/hapticsService';

interface DPadProps {
  onDirectionChange: (directions: { up: boolean; down: boolean; left: boolean; right: boolean }) => void;
  size?: number; // px (default 150)
}

export const DPad: React.FC<DPadProps> = ({ onDirectionChange, size = 150 }) => {
  const [activeDirs, setActiveDirs] = useState({ up: false, down: false, left: false, right: false });
  const touchIdRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastStateRef = useRef({ up: false, down: false, left: false, right: false });

  const updateDirections = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const dist = Math.hypot(dx, dy);

      // Deadzone in the center
      const centerDeadzone = size * 0.16;

      let up = false;
      let down = false;
      let left = false;
      let right = false;

      if (dist > centerDeadzone) {
        // Angle in degrees from center
        const angle = Math.atan2(dy, dx) * (180 / Math.PI); // [-180, 180]

        // 8-directional sectors
        // Right: -67.5 to 67.5
        // Down: 22.5 to 157.5
        // Left: 112.5 to 180 or -180 to -112.5
        // Up: -157.5 to -22.5
        if (angle >= -67.5 && angle <= 67.5) right = true;
        if (angle >= 22.5 && angle <= 157.5) down = true;
        if (angle >= 112.5 || angle <= -112.5) left = true;
        if (angle >= -157.5 && angle <= -22.5) up = true;
      }

      const prev = lastStateRef.current;
      if (prev.up !== up || prev.down !== down || prev.left !== left || prev.right !== right) {
        haptics.impactLight();
        const next = { up, down, left, right };
        lastStateRef.current = next;
        setActiveDirs(next);
        onDirectionChange(next);
      }
    },
    [size, onDirectionChange]
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    updateDirections(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        updateDirections(touch.clientX, touch.clientY);
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
        const reset = { up: false, down: false, left: false, right: false };
        lastStateRef.current = reset;
        setActiveDirs(reset);
        onDirectionChange(reset);
        break;
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    updateDirections(e.clientX, e.clientY);

    const onMouseMove = (me: MouseEvent) => {
      updateDirections(me.clientX, me.clientY);
    };

    const onMouseUp = () => {
      const reset = { up: false, down: false, left: false, right: false };
      lastStateRef.current = reset;
      setActiveDirs(reset);
      onDirectionChange(reset);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const btnSize = size / 3;

  return (
    <div style={styles.wrapper}>
      <div
        ref={containerRef}
        style={{
          ...styles.container,
          width: `${size}px`,
          height: `${size}px`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        {/* Xbox Faceted Disc Backing */}
        <div style={styles.xboxDiscBacking} />

        {/* Cross background */}
        <div style={{ ...styles.crossHorizontal, width: `${size}px`, height: `${btnSize}px` }} />
        <div style={{ ...styles.crossVertical, width: `${btnSize}px`, height: `${size}px` }} />

        {/* Up Wing */}
        <div
          style={{
            ...styles.wing,
            ...styles.wingUp,
            width: `${btnSize}px`,
            height: `${btnSize}px`,
            background: activeDirs.up ? 'var(--accent-primary)' : 'linear-gradient(180deg, #2b3542 0%, #171d26 100%)',
            color: activeDirs.up ? '#000000' : 'rgba(255, 255, 255, 0.85)',
            boxShadow: activeDirs.up ? '0 0 16px var(--accent-glow), inset 0 2px 4px rgba(255,255,255,0.4)' : 'inset 0 1px 1px rgba(255,255,255,0.2)',
          }}
        >
          <ChevronUp size={20} strokeWidth={3} />
        </div>

        {/* Down Wing */}
        <div
          style={{
            ...styles.wing,
            ...styles.wingDown,
            width: `${btnSize}px`,
            height: `${btnSize}px`,
            background: activeDirs.down ? 'var(--accent-primary)' : 'linear-gradient(0deg, #2b3542 0%, #171d26 100%)',
            color: activeDirs.down ? '#000000' : 'rgba(255, 255, 255, 0.85)',
            boxShadow: activeDirs.down ? '0 0 16px var(--accent-glow), inset 0 -2px 4px rgba(255,255,255,0.4)' : 'inset 0 -1px 1px rgba(255,255,255,0.2)',
          }}
        >
          <ChevronDown size={20} strokeWidth={3} />
        </div>

        {/* Left Wing */}
        <div
          style={{
            ...styles.wing,
            ...styles.wingLeft,
            width: `${btnSize}px`,
            height: `${btnSize}px`,
            background: activeDirs.left ? 'var(--accent-primary)' : 'linear-gradient(90deg, #2b3542 0%, #171d26 100%)',
            color: activeDirs.left ? '#000000' : 'rgba(255, 255, 255, 0.85)',
            boxShadow: activeDirs.left ? '0 0 16px var(--accent-glow), inset 2px 0 4px rgba(255,255,255,0.4)' : 'inset 1px 0 1px rgba(255,255,255,0.2)',
          }}
        >
          <ChevronLeft size={20} strokeWidth={3} />
        </div>

        {/* Right Wing */}
        <div
          style={{
            ...styles.wing,
            ...styles.wingRight,
            width: `${btnSize}px`,
            height: `${btnSize}px`,
            background: activeDirs.right ? 'var(--accent-primary)' : 'linear-gradient(270deg, #2b3542 0%, #171d26 100%)',
            color: activeDirs.right ? '#000000' : 'rgba(255, 255, 255, 0.85)',
            boxShadow: activeDirs.right ? '0 0 16px var(--accent-glow), inset -2px 0 4px rgba(255,255,255,0.4)' : 'inset -1px 0 1px rgba(255,255,255,0.2)',
          }}
        >
          <ChevronRight size={20} strokeWidth={3} />
        </div>

        {/* Center Pivot */}
        <div
          style={{
            ...styles.centerPivot,
            width: `${btnSize * 0.8}px`,
            height: `${btnSize * 0.8}px`,
          }}
        />
      </div>
      <span style={styles.label}>D-PAD</span>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    userSelect: 'none',
    touchAction: 'none',
  },
  container: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    touchAction: 'none',
    userSelect: 'none',
    cursor: 'pointer',
  },
  xboxDiscBacking: {
    position: 'absolute',
    inset: '-4px',
    borderRadius: '50%',
    background: 'radial-gradient(circle at 40% 40%, #1e2630 0%, #0d1117 75%, #05070a 100%)',
    border: '1.5px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.8), inset 0 2px 4px rgba(255,255,255,0.1)',
    pointerEvents: 'none',
  },
  crossHorizontal: {
    position: 'absolute',
    borderRadius: '6px',
    background: '#161c24',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.7)',
    pointerEvents: 'none',
  },
  crossVertical: {
    position: 'absolute',
    borderRadius: '6px',
    background: '#161c24',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.7)',
    pointerEvents: 'none',
  },
  wing: {
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    transition: 'all 0.08s ease',
    pointerEvents: 'none',
  },
  wingUp: {
    top: 0,
    borderTopLeftRadius: '6px',
    borderTopRightRadius: '6px',
  },
  wingDown: {
    bottom: 0,
    borderBottomLeftRadius: '6px',
    borderBottomRightRadius: '6px',
  },
  wingLeft: {
    left: 0,
    borderTopLeftRadius: '6px',
    borderBottomLeftRadius: '6px',
  },
  wingRight: {
    right: 0,
    borderTopRightRadius: '6px',
    borderBottomRightRadius: '6px',
  },
  centerPivot: {
    position: 'absolute',
    borderRadius: '50%',
    background: 'radial-gradient(circle at 45% 45%, #242c38 0%, #10141a 80%)',
    border: '1.5px solid rgba(255, 255, 255, 0.12)',
    boxShadow: 'inset 0 3px 6px rgba(0, 0, 0, 0.9), 0 1px 2px rgba(255, 255, 255, 0.15)',
    pointerEvents: 'none',
  },
  label: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.8px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
};
