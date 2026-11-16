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
            backgroundColor: activeDirs.up ? 'var(--accent-primary)' : 'var(--bg-elevated)',
            color: activeDirs.up ? '#000' : 'var(--text-secondary)',
            boxShadow: activeDirs.up ? '0 0 12px var(--accent-glow)' : 'none',
          }}
        >
          <ChevronUp size={20} strokeWidth={2.5} />
        </div>

        {/* Down Wing */}
        <div
          style={{
            ...styles.wing,
            ...styles.wingDown,
            width: `${btnSize}px`,
            height: `${btnSize}px`,
            backgroundColor: activeDirs.down ? 'var(--accent-primary)' : 'var(--bg-elevated)',
            color: activeDirs.down ? '#000' : 'var(--text-secondary)',
            boxShadow: activeDirs.down ? '0 0 12px var(--accent-glow)' : 'none',
          }}
        >
          <ChevronDown size={20} strokeWidth={2.5} />
        </div>

        {/* Left Wing */}
        <div
          style={{
            ...styles.wing,
            ...styles.wingLeft,
            width: `${btnSize}px`,
            height: `${btnSize}px`,
            backgroundColor: activeDirs.left ? 'var(--accent-primary)' : 'var(--bg-elevated)',
            color: activeDirs.left ? '#000' : 'var(--text-secondary)',
            boxShadow: activeDirs.left ? '0 0 12px var(--accent-glow)' : 'none',
          }}
        >
          <ChevronLeft size={20} strokeWidth={2.5} />
        </div>

        {/* Right Wing */}
        <div
          style={{
            ...styles.wing,
            ...styles.wingRight,
            width: `${btnSize}px`,
            height: `${btnSize}px`,
            backgroundColor: activeDirs.right ? 'var(--accent-primary)' : 'var(--bg-elevated)',
            color: activeDirs.right ? '#000' : 'var(--text-secondary)',
            boxShadow: activeDirs.right ? '0 0 12px var(--accent-glow)' : 'none',
          }}
        >
          <ChevronRight size={20} strokeWidth={2.5} />
        </div>

        {/* Center Pivot */}
        <div
          style={{
            ...styles.centerPivot,
            width: `${btnSize * 0.7}px`,
            height: `${btnSize * 0.7}px`,
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
  crossHorizontal: {
    position: 'absolute',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    pointerEvents: 'none',
  },
  crossVertical: {
    position: 'absolute',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    pointerEvents: 'none',
  },
  wing: {
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    transition: 'all 0.1s ease',
    pointerEvents: 'none',
  },
  wingUp: {
    top: 0,
    borderTopLeftRadius: '8px',
    borderTopRightRadius: '8px',
  },
  wingDown: {
    bottom: 0,
    borderBottomLeftRadius: '8px',
    borderBottomRightRadius: '8px',
  },
  wingLeft: {
    left: 0,
    borderTopLeftRadius: '8px',
    borderBottomLeftRadius: '8px',
  },
  wingRight: {
    right: 0,
    borderTopRightRadius: '8px',
    borderBottomRightRadius: '8px',
  },
  centerPivot: {
    position: 'absolute',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    boxShadow: 'inset 0 0 6px rgba(0, 0, 0, 0.6)',
    pointerEvents: 'none',
  },
  label: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.5px',
    color: 'var(--text-muted)',
  },
};
