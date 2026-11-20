import React, { useRef } from 'react';
import { haptics } from '../../services/hapticsService';

interface TriggerBarProps {
  onBumperChange: (bumper: 'lb' | 'rb', pressed: boolean) => void;
  onTriggerChange: (trigger: 'lt' | 'rt', value: number) => void;
  bumpersState: { lb: boolean; rb: boolean };
  triggersState: { lt: number; rt: number };
}

export const TriggerBar: React.FC<TriggerBarProps> = ({
  onBumperChange,
  onTriggerChange,
  bumpersState,
  triggersState,
}) => {
  const touchIdRef = useRef<{ [key: string]: number }>({});

  const handleBumperStart = (bumper: 'lb' | 'rb') => {
    haptics.impactMedium();
    onBumperChange(bumper, true);
  };

  const handleBumperEnd = (bumper: 'lb' | 'rb') => {
    onBumperChange(bumper, false);
  };

  // Analog trigger sliding / pressing
  const handleTriggerTouchStart = (trigger: 'lt' | 'rt', e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    touchIdRef.current[trigger] = touch.identifier;
    haptics.impactHeavy();
    onTriggerChange(trigger, 1.0); // full press on tap
  };

  const handleTriggerTouchEnd = (trigger: 'lt' | 'rt', e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current[trigger]) {
        delete touchIdRef.current[trigger];
        onTriggerChange(trigger, 0.0);
        break;
      }
    }
  };

  return (
    <div style={styles.container}>
      {/* Left Shoulder Cluster: L2 (LT) and L1 (LB) */}
      <div style={styles.cluster}>
        {/* L2 Analog Trigger */}
        <div
          style={{
            ...styles.triggerButton,
            borderColor: triggersState.lt > 0 ? 'var(--accent-primary)' : 'var(--border-light)',
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            handleTriggerTouchStart('lt', e);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleTriggerTouchEnd('lt', e);
          }}
          onTouchCancel={(e) => {
            e.preventDefault();
            handleTriggerTouchEnd('lt', e);
          }}
          onMouseDown={() => {
            haptics.impactHeavy();
            onTriggerChange('lt', 1.0);
          }}
          onMouseUp={() => onTriggerChange('lt', 0.0)}
          onMouseLeave={() => onTriggerChange('lt', 0.0)}
        >
          {/* Fill gauge */}
          <div
            style={{
              ...styles.triggerFill,
              height: `${triggersState.lt * 100}%`,
              background: 'linear-gradient(0deg, var(--accent-primary) 0%, rgba(16, 124, 16, 0.4) 100%)',
              opacity: triggersState.lt > 0 ? 0.7 : 0,
            }}
          />
          <span style={styles.triggerLabel}>LT</span>
          <span style={styles.triggerValue}>
            {triggersState.lt > 0 ? `${Math.round(triggersState.lt * 100)}%` : ''}
          </span>
        </div>

        {/* LB Bumper */}
        <button
          style={{
            ...styles.bumperButton,
            background: bumpersState.lb
              ? 'var(--accent-primary)'
              : 'linear-gradient(180deg, #2b3542 0%, #151a22 100%)',
            color: bumpersState.lb ? '#000000' : 'var(--text-primary)',
            borderColor: bumpersState.lb ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.2)',
            boxShadow: bumpersState.lb
              ? '0 0 16px var(--accent-glow), inset 0 2px 4px rgba(255,255,255,0.4)'
              : '0 3px 8px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.2)',
            transform: bumpersState.lb ? 'scale(0.96) translateY(1px)' : 'scale(1)',
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            handleBumperStart('lb');
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleBumperEnd('lb');
          }}
          onTouchCancel={(e) => {
            e.preventDefault();
            handleBumperEnd('lb');
          }}
          onMouseDown={() => handleBumperStart('lb')}
          onMouseUp={() => handleBumperEnd('lb')}
          onMouseLeave={() => {
            if (bumpersState.lb) handleBumperEnd('lb');
          }}
        >
          <span style={styles.bumperLabel}>LB</span>
        </button>
      </div>

      {/* Right Shoulder Cluster: RB and RT */}
      <div style={styles.cluster}>
        {/* RB Bumper */}
        <button
          style={{
            ...styles.bumperButton,
            background: bumpersState.rb
              ? 'var(--accent-primary)'
              : 'linear-gradient(180deg, #2b3542 0%, #151a22 100%)',
            color: bumpersState.rb ? '#000000' : 'var(--text-primary)',
            borderColor: bumpersState.rb ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.2)',
            boxShadow: bumpersState.rb
              ? '0 0 16px var(--accent-glow), inset 0 2px 4px rgba(255,255,255,0.4)'
              : '0 3px 8px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.2)',
            transform: bumpersState.rb ? 'scale(0.96) translateY(1px)' : 'scale(1)',
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            handleBumperStart('rb');
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleBumperEnd('rb');
          }}
          onTouchCancel={(e) => {
            e.preventDefault();
            handleBumperEnd('rb');
          }}
          onMouseDown={() => handleBumperStart('rb')}
          onMouseUp={() => handleBumperEnd('rb')}
          onMouseLeave={() => {
            if (bumpersState.rb) handleBumperEnd('rb');
          }}
        >
          <span style={styles.bumperLabel}>RB</span>
        </button>

        {/* RT Analog Trigger */}
        <div
          style={{
            ...styles.triggerButton,
            borderColor: triggersState.rt > 0 ? 'var(--accent-primary)' : 'rgba(255,255,255,0.2)',
            boxShadow: triggersState.rt > 0
              ? '0 0 16px var(--accent-glow)'
              : '0 4px 10px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.15)',
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            handleTriggerTouchStart('rt', e);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleTriggerTouchEnd('rt', e);
          }}
          onTouchCancel={(e) => {
            e.preventDefault();
            handleTriggerTouchEnd('rt', e);
          }}
          onMouseDown={() => {
            haptics.impactHeavy();
            onTriggerChange('rt', 1.0);
          }}
          onMouseUp={() => onTriggerChange('rt', 0.0)}
          onMouseLeave={() => onTriggerChange('rt', 0.0)}
        >
          {/* Fill gauge */}
          <div
            style={{
              ...styles.triggerFill,
              height: `${triggersState.rt * 100}%`,
              background: 'linear-gradient(0deg, var(--accent-primary) 0%, rgba(16, 124, 16, 0.4) 100%)',
              opacity: triggersState.rt > 0 ? 0.7 : 0,
            }}
          />
          <span style={styles.triggerLabel}>RT</span>
          <span style={styles.triggerValue}>
            {triggersState.rt > 0 ? `${Math.round(triggersState.rt * 100)}%` : ''}
          </span>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    padding: '4px 16px',
    boxSizing: 'border-box',
    userSelect: 'none',
    touchAction: 'none',
  },
  cluster: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  bumperButton: {
    height: '38px',
    minWidth: '85px',
    padding: '0 12px',
    borderRadius: '8px',
    border: '1.5px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    touchAction: 'none',
    userSelect: 'none',
    transition: 'all 0.08s ease',
  },
  bumperLabel: {
    fontSize: '12px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
  },
  triggerButton: {
    height: '42px',
    minWidth: '95px',
    padding: '0 12px',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-elevated)',
    border: '1.5px solid',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
    touchAction: 'none',
    userSelect: 'none',
  },
  triggerFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    pointerEvents: 'none',
    transition: 'height 0.05s ease-out',
  },
  triggerLabel: {
    fontSize: '11px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    zIndex: 1,
    color: 'var(--text-primary)',
  },
  triggerValue: {
    fontSize: '10px',
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent-primary)',
    zIndex: 1,
    height: '12px',
  },
};
