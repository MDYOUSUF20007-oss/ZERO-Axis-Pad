import React from 'react';
import { haptics } from '../../services/hapticsService';

interface ActionButtonsProps {
  onButtonChange: (button: 'a' | 'b' | 'x' | 'y', pressed: boolean) => void;
  buttonsState: { a: boolean; b: boolean; x: boolean; y: boolean };
  size?: number; // overall diameter (default 150)
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onButtonChange,
  buttonsState,
  size = 150,
}) => {
  const btnSize = 46;

  const handleStart = (btn: 'a' | 'b' | 'x' | 'y') => {
    haptics.impactMedium();
    onButtonChange(btn, true);
  };

  const handleEnd = (btn: 'a' | 'b' | 'x' | 'y') => {
    onButtonChange(btn, false);
  };

  // Button config: X left, Y top, B right, A bottom
  const buttonConfigs: {
    id: 'a' | 'b' | 'x' | 'y';
    label: string;
    top: number;
    left: number;
    color: string;
    glow: string;
  }[] = [
    {
      id: 'y',
      label: 'Y',
      top: 0,
      left: (size - btnSize) / 2,
      color: '#eab308', // Yellow
      glow: 'rgba(234, 179, 8, 0.45)',
    },
    {
      id: 'b',
      label: 'B',
      top: (size - btnSize) / 2,
      left: size - btnSize,
      color: '#ef4444', // Red
      glow: 'rgba(239, 68, 68, 0.45)',
    },
    {
      id: 'a',
      label: 'A',
      top: size - btnSize,
      left: (size - btnSize) / 2,
      color: '#22c55e', // Green
      glow: 'rgba(34, 197, 94, 0.45)',
    },
    {
      id: 'x',
      label: 'X',
      top: (size - btnSize) / 2,
      left: 0,
      color: '#3b82f6', // Blue
      glow: 'rgba(59, 130, 246, 0.45)',
    },
  ];

  return (
    <div style={styles.wrapper}>
      <div
        style={{
          ...styles.container,
          width: `${size}px`,
          height: `${size}px`,
        }}
      >
        {/* Subtle circular backing plate */}
        <div style={styles.backingCircle} />

        {buttonConfigs.map((cfg) => {
          const isPressed = buttonsState[cfg.id];
          return (
            <button
              key={cfg.id}
              style={{
                ...styles.button,
                width: `${btnSize}px`,
                height: `${btnSize}px`,
                top: `${cfg.top}px`,
                left: `${cfg.left}px`,
                borderColor: isPressed ? cfg.color : 'rgba(255,255,255,0.15)',
                backgroundColor: isPressed ? cfg.color : 'var(--bg-elevated)',
                color: isPressed ? '#000000' : cfg.color,
                boxShadow: isPressed
                  ? `0 0 16px ${cfg.glow}, inset 0 0 8px rgba(0,0,0,0.4)`
                  : 'var(--shadow-sm)',
                transform: isPressed ? 'scale(0.92)' : 'scale(1)',
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                handleStart(cfg.id);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleEnd(cfg.id);
              }}
              onTouchCancel={(e) => {
                e.preventDefault();
                handleEnd(cfg.id);
              }}
              onMouseDown={() => handleStart(cfg.id)}
              onMouseUp={() => handleEnd(cfg.id)}
              onMouseLeave={() => {
                if (buttonsState[cfg.id]) handleEnd(cfg.id);
              }}
            >
              <span style={styles.btnLabel}>{cfg.label}</span>
            </button>
          );
        })}
      </div>
      <span style={styles.label}>ACTIONS</span>
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
    userSelect: 'none',
    touchAction: 'none',
  },
  backingCircle: {
    position: 'absolute',
    inset: '12px',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    pointerEvents: 'none',
  },
  button: {
    position: 'absolute',
    borderRadius: '50%',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    touchAction: 'none',
    userSelect: 'none',
    transition: 'transform 0.08s ease, background-color 0.08s, box-shadow 0.08s',
  },
  btnLabel: {
    fontSize: '17px',
    fontWeight: 800,
    fontFamily: 'var(--font-mono)',
    lineHeight: 1,
  },
  label: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.5px',
    color: 'var(--text-muted)',
  },
};
