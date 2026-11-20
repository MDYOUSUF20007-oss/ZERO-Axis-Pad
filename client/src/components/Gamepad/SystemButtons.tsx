import React from 'react';
import { Compass, CircleDot, Copy, Menu } from 'lucide-react';
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
          borderColor: systemState.l3 ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.15)',
          background: systemState.l3 ? 'var(--accent-primary)' : 'linear-gradient(180deg, #242c38 0%, #151a22 100%)',
          color: systemState.l3 ? '#000000' : 'var(--text-muted)',
          boxShadow: systemState.l3 ? '0 0 12px var(--accent-glow)' : '0 2px 4px rgba(0,0,0,0.5)',
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
        <span>LS</span>
      </button>

      {/* Xbox View (Back / Select) Button */}
      <button
        style={{
          ...styles.smallCircle,
          background: systemState.select ? 'var(--accent-primary)' : 'radial-gradient(circle at 40% 40%, #2e3846 0%, #171d26 80%)',
          color: systemState.select ? '#000000' : 'rgba(255,255,255,0.8)',
          borderColor: systemState.select ? 'var(--accent-primary)' : 'rgba(255,255,255,0.2)',
          boxShadow: systemState.select ? '0 0 14px var(--accent-glow)' : '0 2px 6px rgba(0,0,0,0.6)',
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
        title="View Button (Select)"
      >
        <Copy size={14} strokeWidth={2.5} />
      </button>

      {/* Center Xbox Nexus / Guide Button & Motion Steering Quick Toggle */}
      <div style={styles.centerGroup}>
        <button
          style={{
            ...styles.nexusButton,
            background: systemState.guide
              ? '#ffffff'
              : 'radial-gradient(circle at 45% 40%, #303b4a 0%, #18202b 60%, #0d1218 100%)',
            borderColor: systemState.guide ? '#ffffff' : 'rgba(255,255,255,0.3)',
            boxShadow: systemState.guide
              ? '0 0 25px #ffffff, inset 0 0 10px rgba(0,0,0,0.5)'
              : '0 4px 12px rgba(0,0,0,0.8), 0 0 12px var(--xbox-green-glow)',
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
          title="Xbox Guide / Home Button"
        >
          {/* Authentic Xbox X Logo Silhouette */}
          <svg viewBox="0 0 100 100" style={{ width: '26px', height: '26px' }}>
            <path
              d="M 23 20 C 35 34, 45 46, 50 53 C 55 46, 65 34, 77 20 C 65 11, 35 11, 23 20 Z"
              fill={systemState.guide ? '#000000' : '#ffffff'}
            />
            <path
              d="M 17 26 C 28 42, 43 60, 48 67 C 36 78, 25 87, 18 84 C 9 73, 9 39, 17 26 Z"
              fill={systemState.guide ? '#000000' : '#ffffff'}
            />
            <path
              d="M 83 26 C 72 42, 57 60, 52 67 C 64 78, 75 87, 82 84 C 91 73, 91 39, 83 26 Z"
              fill={systemState.guide ? '#000000' : '#ffffff'}
            />
          </svg>
        </button>

        {/* Quick Motion Steering Toggle Badge */}
        <button
          style={{
            ...styles.motionToggle,
            borderColor: motionSteeringActive ? 'var(--accent-primary)' : 'rgba(255,255,255,0.15)',
            background: motionSteeringActive ? 'var(--accent-dim)' : 'rgba(0,0,0,0.4)',
            color: motionSteeringActive ? 'var(--accent-primary)' : 'var(--text-muted)',
            boxShadow: motionSteeringActive ? '0 0 8px var(--accent-glow)' : 'none',
          }}
          onClick={() => {
            haptics.impactMedium();
            onToggleMotionSteering();
          }}
          title="Toggle Gyro Steering"
        >
          <Compass
            size={11}
            style={{
              transform: `rotate(${steeringAngleDeg}deg)`,
              transition: 'transform 0.05s linear',
            }}
          />
          <span>{motionSteeringActive ? `STEER: ${Math.round(steeringAngleDeg)}°` : 'GYRO'}</span>
        </button>
      </div>

      {/* Xbox Menu (Start) Button */}
      <button
        style={{
          ...styles.smallCircle,
          background: systemState.start ? 'var(--accent-primary)' : 'radial-gradient(circle at 40% 40%, #2e3846 0%, #171d26 80%)',
          color: systemState.start ? '#000000' : 'rgba(255,255,255,0.8)',
          borderColor: systemState.start ? 'var(--accent-primary)' : 'rgba(255,255,255,0.2)',
          boxShadow: systemState.start ? '0 0 14px var(--accent-glow)' : '0 2px 6px rgba(0,0,0,0.6)',
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
        title="Menu Button (Start)"
      >
        <Menu size={14} strokeWidth={2.5} />
      </button>

      {/* R3 Stick Click Button */}
      <button
        style={{
          ...styles.stickClickBtn,
          borderColor: systemState.r3 ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.15)',
          background: systemState.r3 ? 'var(--accent-primary)' : 'linear-gradient(180deg, #242c38 0%, #151a22 100%)',
          color: systemState.r3 ? '#000000' : 'var(--text-muted)',
          boxShadow: systemState.r3 ? '0 0 12px var(--accent-glow)' : '0 2px 4px rgba(0,0,0,0.5)',
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
        <span>RS</span>
      </button>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '2px 0',
    userSelect: 'none',
    touchAction: 'none',
  },
  stickClickBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '14px',
    border: '1.5px solid',
    fontSize: '11px',
    fontWeight: 800,
    fontFamily: 'var(--font-mono)',
    cursor: 'pointer',
    touchAction: 'none',
    userSelect: 'none',
    transition: 'all 0.1s ease',
  },
  smallCircle: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '1.5px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    touchAction: 'none',
    userSelect: 'none',
    transition: 'all 0.1s ease',
  },
  centerGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '3px',
  },
  nexusButton: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    touchAction: 'none',
    userSelect: 'none',
    transition: 'all 0.12s ease',
  },
  motionToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    borderRadius: '10px',
    border: '1px solid',
    fontSize: '9px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    cursor: 'pointer',
    transition: 'all 0.1s ease',
  },
};
