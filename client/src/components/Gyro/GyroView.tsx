import React, { useState, useEffect } from 'react';
import {
  Compass,
  Sliders,
  Gauge,
  Plane,
  Crosshair,
} from 'lucide-react';
import type { ControllerSettings, MotionData } from '../../types/controller';
import { networkService } from '../../services/networkService';
import { haptics } from '../../services/hapticsService';

interface GyroViewProps {
  settings: ControllerSettings;
  motion: MotionData;
  steeringValue: number; // [-1.0, 1.0]
  onCalibrate: () => void;
  onUpdateSettings: (settings: Partial<ControllerSettings>) => void;
}

export const GyroView: React.FC<GyroViewProps> = ({
  settings,
  motion,
  steeringValue,
  onCalibrate,
  onUpdateSettings,
}) => {
  const [subMode, setSubMode] = useState<'racing' | 'flight'>('racing');
  const [throttle, setThrottle] = useState<number>(0);
  const [brake, setBrake] = useState<number>(0);
  const [handbrake, setHandbrake] = useState<boolean>(false);
  const [showConfig, setShowConfig] = useState<boolean>(false);

  // Send motion and virtual controls to server
  useEffect(() => {
    // Send motion packet
    networkService.sendMotion(motion.pitch, motion.roll, motion.yaw, steeringValue);

    // Also send gamepad packet mapped for racing games
    // Left stick X = steeringValue
    // Right trigger RT = throttle (accelerator)
    // Left trigger LT = brake
    // Button A = handbrake
    networkService.sendGamepadState(
      {
        lx: steeringValue,
        ly: subMode === 'flight' ? -Math.max(-1, Math.min(1, motion.pitch / 45)) : 0,
        rx: 0,
        ry: 0,
        lt: brake,
        rt: throttle,
      },
      {
        a: handbrake,
        b: false,
        x: false,
        y: false,
        dpad_up: false,
        dpad_down: false,
        dpad_left: false,
        dpad_right: false,
        lb: false,
        rb: false,
        l3: false,
        r3: false,
        select: false,
        start: false,
        guide: false,
      }
    );
  }, [motion.pitch, motion.roll, motion.yaw, steeringValue, throttle, brake, handbrake, subMode]);

  // Handle pedal touch
  const handleThrottleStart = () => {
    haptics.impactHeavy();
    setThrottle(1.0);
  };
  const handleThrottleEnd = () => {
    setThrottle(0.0);
  };

  const handleBrakeStart = () => {
    haptics.impactHeavy();
    setBrake(1.0);
  };
  const handleBrakeEnd = () => {
    setBrake(0.0);
  };

  const handleHandbrakeStart = () => {
    haptics.impactHeavy();
    setHandbrake(true);
  };
  const handleHandbrakeEnd = () => {
    setHandbrake(false);
  };

  const steeringAngle = motion.roll; // gamma [-90, 90]
  const clampedAngle = Math.max(-90, Math.min(90, steeringAngle));

  return (
    <div style={styles.container}>
      {/* Top Bar: Sub-mode Selector, Calibrate, Settings */}
      <div style={styles.topBar}>
        <div style={styles.modePills}>
          <button
            style={{
              ...styles.pillBtn,
              backgroundColor: subMode === 'racing' ? 'var(--accent-primary)' : 'var(--bg-elevated)',
              color: subMode === 'racing' ? '#000' : 'var(--text-secondary)',
            }}
            onClick={() => {
              haptics.impactLight();
              setSubMode('racing');
            }}
          >
            <Gauge size={14} />
            <span>Racing Wheel</span>
          </button>

          <button
            style={{
              ...styles.pillBtn,
              backgroundColor: subMode === 'flight' ? 'var(--accent-primary)' : 'var(--bg-elevated)',
              color: subMode === 'flight' ? '#000' : 'var(--text-secondary)',
            }}
            onClick={() => {
              haptics.impactLight();
              setSubMode('flight');
            }}
          >
            <Plane size={14} />
            <span>Flight Sim 6-DOF</span>
          </button>
        </div>

        <div style={styles.rightActions}>
          <button
            style={styles.actionBtn}
            onClick={() => {
              haptics.impactHeavy();
              onCalibrate();
            }}
            title="Reset Neutral Center (Zero)"
          >
            <Crosshair size={14} />
            <span>Center (0°)</span>
          </button>

          <button
            style={styles.iconBtn}
            onClick={() => setShowConfig((p) => !p)}
            title="Adjust Gyro Settings"
          >
            <Sliders size={16} />
          </button>
        </div>
      </div>

      {/* Settings Drawer */}
      {showConfig && (
        <div style={styles.configDrawer}>
          <div style={styles.configRow}>
            <span style={styles.configLabel}>Sensitivity ({settings.gyroSensitivity.toFixed(1)}x)</span>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={settings.gyroSensitivity}
              onChange={(e) => onUpdateSettings({ gyroSensitivity: parseFloat(e.target.value) })}
              style={styles.slider}
            />
          </div>

          <div style={styles.configRow}>
            <span style={styles.configLabel}>Deadzone ({settings.gyroDeadzone}°)</ span>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={settings.gyroDeadzone}
              onChange={(e) => onUpdateSettings({ gyroDeadzone: parseFloat(e.target.value) })}
              style={styles.slider}
            />
          </div>

          <div style={styles.configRow}>
            <span style={styles.configLabel}>Invert Steering Axis</span>
            <input
              type="checkbox"
              checked={settings.gyroInvert}
              onChange={(e) => onUpdateSettings({ gyroInvert: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
            />
          </div>
        </div>
      )}

      {/* Main Visual Arena */}
      {subMode === 'racing' ? (
        <div style={styles.racingArena}>
          {/* Left Pedal: Brake & Handbrake */}
          <div style={styles.pedalCluster}>
            <button
              style={{
                ...styles.pedal,
                ...styles.brakePedal,
                backgroundColor: brake > 0 ? '#ef4444' : 'var(--bg-elevated)',
                color: brake > 0 ? '#ffffff' : '#ef4444',
                borderColor: '#ef4444',
                boxShadow: brake > 0 ? '0 0 20px rgba(239, 68, 68, 0.5)' : 'none',
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                handleBrakeStart();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleBrakeEnd();
              }}
              onMouseDown={handleBrakeStart}
              onMouseUp={handleBrakeEnd}
            >
              <span style={styles.pedalLabel}>BRAKE</span>
              <span style={styles.pedalSub}>LT / REVERSE</span>
            </button>

            <button
              style={{
                ...styles.handbrakeBtn,
                backgroundColor: handbrake ? 'var(--accent-primary)' : 'var(--bg-surface)',
                color: handbrake ? '#000' : 'var(--text-secondary)',
                borderColor: 'var(--border-light)',
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                handleHandbrakeStart();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleHandbrakeEnd();
              }}
              onMouseDown={handleHandbrakeStart}
              onMouseUp={handleHandbrakeEnd}
            >
              HANDBRAKE (A)
            </button>
          </div>

          {/* Center: Dynamic Virtual Steering Wheel HUD */}
          <div style={styles.wheelContainer}>
            {/* Live Angle Readout */}
            <div style={styles.angleDisplay}>
              <span style={styles.angleValue}>
                {Math.abs(clampedAngle).toFixed(1)}°
              </span>
              <span style={styles.angleDir}>
                {clampedAngle < -1 ? 'LEFT' : clampedAngle > 1 ? 'RIGHT' : 'CENTER'}
              </span>
              <span style={styles.normalizedVal}>
                Normalized: {steeringValue.toFixed(2)}
              </span>
            </div>

            {/* Rotating Steering Wheel Graphic */}
            <div
              style={{
                ...styles.steeringWheel,
                transform: `rotate(${clampedAngle}deg)`,
              }}
            >
              {/* Outer Rim */}
              <div style={styles.wheelRim} />
              {/* Top Center Notch */}
              <div style={styles.wheelNotch} />
              {/* Horizontal Spokes */}
              <div style={styles.wheelSpokeH} />
              {/* Bottom Spoke */}
              <div style={styles.wheelSpokeV} />
              {/* Center Cap */}
              <div style={styles.wheelCenterCap}>
                <Compass size={24} color="var(--accent-primary)" />
              </div>
            </div>
          </div>

          {/* Right Pedal: Throttle (Accelerator) */}
          <div style={styles.pedalCluster}>
            <button
              style={{
                ...styles.pedal,
                ...styles.gasPedal,
                backgroundColor: throttle > 0 ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                color: throttle > 0 ? '#000000' : 'var(--accent-primary)',
                borderColor: 'var(--accent-primary)',
                boxShadow: throttle > 0 ? '0 0 20px var(--accent-glow)' : 'none',
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                handleThrottleStart();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleThrottleEnd();
              }}
              onMouseDown={handleThrottleStart}
              onMouseUp={handleThrottleEnd}
            >
              <span style={styles.pedalLabel}>THROTTLE</span>
              <span style={styles.pedalSub}>RT / GAS</span>
            </button>
          </div>
        </div>
      ) : (
        /* Flight Sim Horizon Mode */
        <div style={styles.flightArena}>
          <div style={styles.horizonHud}>
            {/* Artificial Horizon Pitch Ladder */}
            <div style={styles.pitchLadder}>
              <div
                style={{
                  ...styles.horizonSky,
                  transform: `translateY(${motion.pitch * 2}px) rotate(${motion.roll}deg)`,
                }}
              >
                <div style={styles.horizonLine} />
              </div>
              <div style={styles.aircraftSymbol} />
            </div>

            {/* Readout Telemetry */}
            <div style={styles.flightTelemetry}>
              <div style={styles.telemetryCard}>
                <span style={styles.telemLabel}>PITCH (Beta)</span>
                <span style={styles.telemValue}>{motion.pitch.toFixed(1)}°</span>
              </div>
              <div style={styles.telemetryCard}>
                <span style={styles.telemLabel}>ROLL (Gamma)</span>
                <span style={styles.telemValue}>{motion.roll.toFixed(1)}°</span>
              </div>
              <div style={styles.telemetryCard}>
                <span style={styles.telemLabel}>YAW (Alpha)</span>
                <span style={styles.telemValue}>{motion.yaw.toFixed(1)}°</span>
              </div>
            </div>
          </div>
        </div>
      )}
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
    padding: '8px',
    overflow: 'hidden',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  },
  modePills: {
    display: 'flex',
    backgroundColor: 'var(--bg-surface)',
    borderRadius: '8px',
    padding: '3px',
    gap: '4px',
    border: '1px solid var(--border-light)',
  },
  pillBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  rightActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '6px 12px',
    borderRadius: '6px',
    backgroundColor: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-light)',
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
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
  configDrawer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '10px 14px',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    border: '1px solid var(--border-light)',
    marginTop: '6px',
  },
  configRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  configLabel: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  slider: {
    flex: 1,
    maxWidth: '200px',
    accentColor: 'var(--accent-primary)',
    height: '4px',
    cursor: 'pointer',
  },
  racingArena: {
    flex: 1,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 20px',
    overflow: 'hidden',
  },
  pedalCluster: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    alignItems: 'center',
  },
  pedal: {
    width: '100px',
    height: '170px',
    borderRadius: '16px',
    border: '2px solid',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    cursor: 'pointer',
    touchAction: 'none',
    userSelect: 'none',
    transition: 'transform 0.08s ease, box-shadow 0.1s ease',
  },
  brakePedal: {
    borderTopLeftRadius: '24px',
  },
  gasPedal: {
    borderTopRightRadius: '24px',
  },
  pedalLabel: {
    fontSize: '15px',
    fontWeight: 800,
    fontFamily: 'var(--font-mono)',
    letterSpacing: '1px',
  },
  pedalSub: {
    fontSize: '10px',
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
    opacity: 0.8,
  },
  handbrakeBtn: {
    width: '100px',
    height: '42px',
    borderRadius: '8px',
    border: '1.5px solid',
    fontSize: '11px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  wheelContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  angleDisplay: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  angleValue: {
    fontSize: '28px',
    fontWeight: 800,
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent-primary)',
    lineHeight: 1,
  },
  angleDir: {
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '1.5px',
    color: 'var(--text-secondary)',
  },
  normalizedVal: {
    fontSize: '10px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)',
  },
  steeringWheel: {
    width: '190px',
    height: '190px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.04s linear',
    willChange: 'transform',
  },
  wheelRim: {
    position: 'absolute',
    inset: 0,
    borderRadius: '50%',
    border: '14px solid var(--bg-elevated)',
    boxShadow: '0 0 16px rgba(0, 0, 0, 0.8), inset 0 0 12px rgba(0, 0, 0, 0.8)',
  },
  wheelNotch: {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '16px',
    height: '14px',
    backgroundColor: 'var(--accent-primary)',
    boxShadow: '0 0 8px var(--accent-glow)',
    borderRadius: '2px',
  },
  wheelSpokeH: {
    position: 'absolute',
    left: '14px',
    right: '14px',
    height: '12px',
    backgroundColor: 'var(--bg-elevated)',
    borderRadius: '4px',
  },
  wheelSpokeV: {
    position: 'absolute',
    bottom: '14px',
    width: '12px',
    height: '70px',
    backgroundColor: 'var(--bg-elevated)',
    borderRadius: '4px',
  },
  wheelCenterCap: {
    position: 'absolute',
    width: '54px',
    height: '54px',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-surface)',
    border: '2px solid var(--accent-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 12px rgba(0, 0, 0, 0.9)',
  },
  flightArena: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  },
  horizonHud: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  pitchLadder: {
    width: '260px',
    height: '180px',
    borderRadius: '12px',
    border: '2px solid var(--accent-border)',
    backgroundColor: 'var(--bg-surface)',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizonSky: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.04s linear',
  },
  horizonLine: {
    width: '100%',
    height: '2px',
    backgroundColor: 'var(--accent-primary)',
    boxShadow: '0 0 6px var(--accent-glow)',
  },
  aircraftSymbol: {
    position: 'absolute',
    width: '40px',
    height: '4px',
    backgroundColor: '#ffffff',
    borderRadius: '2px',
    boxShadow: '0 0 8px rgba(255,255,255,0.8)',
  },
  flightTelemetry: {
    display: 'flex',
    gap: '16px',
  },
  telemetryCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 14px',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    border: '1px solid var(--border-light)',
  },
  telemLabel: {
    fontSize: '10px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)',
  },
  telemValue: {
    fontSize: '16px',
    fontWeight: 800,
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent-primary)',
  },
};
