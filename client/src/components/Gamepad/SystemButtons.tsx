import React from 'react';
import { Compass, CircleDot } from 'lucide-react';
import { haptics } from '../../services/hapticsService';

interface SystemButtonsProps {
  onSystemButton: (btn: 'select' | 'start' | 'guide' | 'l3' | 'r3', pressed: boolean) => void;
  systemState: { select: boolean; start: boolean; guide: boolean; l3: boolean; r3: boolean };
  motionSteeringActive: boolean;
  onToggleMotionSteering: () => void;
  steeringAngleDeg: number;
}

export const SystemButtons: React.FC<SystemButtonsProps> = ({
  onSystemButton,
  systemState,
  motionSteeringActive,
  onToggleMotionSteering,
  steeringAngleDeg,
}) => {
  const handlePress = (btn: 'select' | 'start' | 'guide' | 'l3' | 'r3') => {
    haptics.impactMedium();
    onSystemButton(btn, true);
  };

  const handleRelease = (btn: 'select' | 'start' | 'guide' | 'l3' | 'r3') => {
    onSystemButton(btn, false);
  };

  return (
    <div style={styles.container}>
      {/* L3 Stick Click Button */}
      <button
        style={{
          ...styles.stickClickBtn,
          borderColor: systemState.l3 ? 'var(--accent-primary)' : 'var(--border-light)',
          backgroundColor: systemState.l3 ? 'var(--accent-dim)' : 'transparent',
          color: systemState.l3 ? 'var(--accent-primary)' : 'var(--text-muted)',
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          handlePress('l3');
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleRelease('l3');
        }}
        onMouseDown={() => handlePress('l3')}
        onMouseUp={() => handleRelease('l3')}
      >
        <CircleDot size={12} />
        <span>L3</span>
      </button>

      {/* Select / Back Button */}
      <button
        style={{
          ...styles.smallPill,
          backgroundColor: systemState.select ? 'var(--accent-primary)' : 'var(--bg-elevated)',
          color: systemState.select ? '#000' : 'var(--text-secondary)',
          borderColor: systemState.select ? 'var(--accent-primary)' : 'var(--border-light)',
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          handlePress('select');
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleRelease('select');
        }}
        onMouseDown={() => handlePress('select')}
        onMouseUp={() => handleRelease('select')}
      >
        SELECT
      </button>

      {/* Center Guide / Home & Motion Steering Quick Toggle */}
      <div style={styles.centerGroup}>
        <button
          style={{
            ...styles.guideButton,
            backgroundColor: systemState.guide ? 'var(--accent-primary)' : 'var(--bg-elevated)',
            color: systemState.guide ? '#000' : 'var(--accent-primary)',
            boxShadow: systemState.guide
              ? '0 0 16px var(--accent-glow)'
              : '0 0 8px var(--accent-subtle)',
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            handlePress('guide');
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleRelease('guide');
          }}
          onMouseDown={() => handlePress('guide')}
          onMouseUp={() => handleRelease('guide')}
          title="Home / Guide Button"
        >
          <div style={styles.guideInnerRing} />
        </button>

        {/* Quick Motion Steering Toggle Badge */}
        <button
          style={{
            ...styles.motionToggle,
            borderColor: motionSteeringActive ? 'var(--accent-primary)' : 'var(--border-light)',
            backgroundColor: motionSteeringActive ? 'var(--accent-dim)' : 'transparent',
            color: motionSteeringActive ? 'var(--accent-primary)' : 'var(--text-muted)',
          }}
          onClick={() => {
            haptics.impactMedium();
            onToggleMotionSteering();
          }}
          title="Toggle Motion Steering"
        >
          <Compass
            size={12}
            style={{
              transform: `rotate(${steeringAngleDeg}deg)`,
              transition: 'transform 0.05s linear',
            }}
          />
          <span>{motionSteeringActive ? `STEER: ${Math.round(steeringAngleDeg)}°` : 'GYRO OFF'}</span>
        </button>
      </div>

      {/* Start / Menu Button */}
      <button
        style={{
          ...styles.smallPill,
          backgroundColor: systemState.start ? 'var(--accent-primary)' : 'var(--bg-elevated)',
          color: systemState.start ? '#000' : 'var(--text-secondary)',
          borderColor: systemState.start ? 'var(--accent-primary)' : 'var(--border-light)',
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          handlePress('start');
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleRelease('start');
        }}
        onMouseDown={() => handlePress('start')}
        onMouseUp={() => handleRelease('start')}
      >
        START
      </button>

      {/* R3 Stick Click Button */}
      <button
        style={{
          ...styles.stickClickBtn,
          borderColor: systemState.r3 ? 'var(--accent-primary)' : 'var(--border-light)',
          backgroundColor: systemState.r3 ? 'var(--accent-dim)' : 'transparent',
          color: systemState.r3 ? 'var(--accent-primary)' : 'var(--text-muted)',
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          handlePress('r3');
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleRelease('r3');
        }}
        onMouseDown={() => handlePress('r3')}
        onMouseUp={() => handleRelease('r3')}
      >
        <CircleDot size={12} />
        <span>R3</span>
      </button>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '4px 0',
    userSelect: 'none',
    touchAction: 'none',
  },
  stickClickBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 8px',
    borderRadius: '12px',
    border: '1px solid',
    fontSize: '11px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    cursor: 'pointer',
    touchAction: 'none',
    userSelect: 'none',
  },
  smallPill: {
    padding: '4px 10px',
    borderRadius: '12px',
    border: '1px solid',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.5px',
    fontFamily: 'var(--font-mono)',
    cursor: 'pointer',
    touchAction: 'none',
    userSelect: 'none',
  },
  centerGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  guideButton: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '2px solid var(--accent-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    touchAction: 'none',
    userSelect: 'none',
    transition: 'all 0.1s ease',
  },
  guideInnerRing: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    border: '2px solid currentColor',
    backgroundColor: 'transparent',
  },
  motionToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 6px',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '9px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    cursor: 'pointer',
  },
};
