import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VirtualJoystick } from './VirtualJoystick';
import { DPad } from './DPad';
import { ActionButtons } from './ActionButtons';
import { TriggerBar } from './TriggerBar';
import { SystemButtons } from './SystemButtons';
import type { GamepadAxes, GamepadButtons, ControllerSettings } from '../../types/controller';
import { networkService } from '../../services/networkService';

interface GamepadViewProps {
  settings: ControllerSettings;
  steeringValue: number; // [-1.0, 1.0] from motion controller
  rollDeg: number;
}

export const GamepadView: React.FC<GamepadViewProps> = ({
  settings,
  steeringValue,
  rollDeg,
}) => {
  const [motionSteeringActive, setMotionSteeringActive] = useState(settings.gyroSteeringEnabled);

  // Axes state
  const axesRef = useRef<GamepadAxes>({
    lx: 0,
    ly: 0,
    rx: 0,
    ry: 0,
    lt: 0,
    rt: 0,
  });

  // Buttons state
  const buttonsRef = useRef<GamepadButtons>({
    a: false,
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
  });

  const [uiButtons, setUiButtons] = useState<GamepadButtons>(buttonsRef.current);
  const [uiTriggers, setUiTriggers] = useState({ lt: 0, rt: 0 });

  // Transmit current state to host
  const transmit = useCallback(() => {
    // If motion steering is active, override or blend left stick X axis
    const effectiveAxes = { ...axesRef.current };
    if (motionSteeringActive) {
      // Invert if configured
      const sign = settings.gyroInvert ? -1 : 1;
      effectiveAxes.lx = Math.max(-1, Math.min(1, steeringValue * sign));
    }

    networkService.sendGamepadState(effectiveAxes, buttonsRef.current);
  }, [motionSteeringActive, steeringValue, settings.gyroInvert]);

  // Transmit when motion steering updates
  useEffect(() => {
    if (motionSteeringActive) {
      transmit();
    }
  }, [motionSteeringActive, steeringValue, transmit]);

  // Left stick
  const handleLeftStickChange = useCallback(
    (x: number, y: number) => {
      axesRef.current.lx = x;
      axesRef.current.ly = y;
      transmit();
    },
    [transmit]
  );

  // Right stick
  const handleRightStickChange = useCallback(
    (x: number, y: number) => {
      axesRef.current.rx = x;
      axesRef.current.ry = y;
      transmit();
    },
    [transmit]
  );

  // D-Pad
  const handleDPadChange = useCallback(
    (dirs: { up: boolean; down: boolean; left: boolean; right: boolean }) => {
      buttonsRef.current.dpad_up = dirs.up;
      buttonsRef.current.dpad_down = dirs.down;
      buttonsRef.current.dpad_left = dirs.left;
      buttonsRef.current.dpad_right = dirs.right;
      setUiButtons({ ...buttonsRef.current });
      transmit();
    },
    [transmit]
  );

  // ABXY Face buttons
  const handleActionButton = useCallback(
    (btn: 'a' | 'b' | 'x' | 'y', pressed: boolean) => {
      buttonsRef.current[btn] = pressed;
      setUiButtons({ ...buttonsRef.current });
      transmit();
    },
    [transmit]
  );

  // Bumpers
  const handleBumper = useCallback(
    (bumper: 'lb' | 'rb', pressed: boolean) => {
      buttonsRef.current[bumper] = pressed;
      setUiButtons({ ...buttonsRef.current });
      transmit();
    },
    [transmit]
  );

  // Triggers
  const handleTrigger = useCallback(
    (trigger: 'lt' | 'rt', value: number) => {
      axesRef.current[trigger] = value;
      setUiTriggers({ lt: axesRef.current.lt, rt: axesRef.current.rt });
      transmit();
    },
    [transmit]
  );

  // System & Stick clicks
  const handleSystemButton = useCallback(
    (btn: 'select' | 'start' | 'guide' | 'l3' | 'r3', pressed: boolean) => {
      buttonsRef.current[btn] = pressed;
      setUiButtons({ ...buttonsRef.current });
      transmit();
    },
    [transmit]
  );

  return (
    <div style={styles.container}>
      {/* Top Bumpers & Analog Triggers */}
      <TriggerBar
        onBumperChange={handleBumper}
        onTriggerChange={handleTrigger}
        bumpersState={{ lb: uiButtons.lb, rb: uiButtons.rb }}
        triggersState={uiTriggers}
      />

      {/* Middle Row: System Controls (Select, Guide, Start, L3, R3, Gyro Toggle) */}
      <SystemButtons
        onSystemButton={handleSystemButton}
        systemState={{
          select: uiButtons.select,
          start: uiButtons.start,
          guide: uiButtons.guide,
          l3: uiButtons.l3,
          r3: uiButtons.r3,
        }}
        motionSteeringActive={motionSteeringActive}
        onToggleMotionSteering={() => setMotionSteeringActive((prev) => !prev)}
        steeringAngleDeg={rollDeg}
      />

      {/* Main Controls Arena */}
      <div style={styles.controlsArena}>
        {/* Left Side: Left Analog Stick and D-Pad */}
        <div style={styles.controlClusterLeft}>
          <VirtualJoystick
            label="Left Stick"
            size={135}
            knobSize={54}
            onChange={handleLeftStickChange}
            onClickStick={() => handleSystemButton('l3', true)}
          />
          <DPad onDirectionChange={handleDPadChange} size={130} />
        </div>

        {/* Right Side: Action ABXY Buttons and Right Analog Stick */}
        <div style={styles.controlClusterRight}>
          <ActionButtons
            onButtonChange={handleActionButton}
            buttonsState={{
              a: uiButtons.a,
              b: uiButtons.b,
              x: uiButtons.x,
              y: uiButtons.y,
            }}
            size={135}
          />
          <VirtualJoystick
            label="Right Stick"
            size={135}
            knobSize={54}
            onChange={handleRightStickChange}
            onClickStick={() => handleSystemButton('r3', true)}
          />
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '4px 10px 10px 10px',
    backgroundColor: 'var(--bg-primary)',
    userSelect: 'none',
    touchAction: 'none',
    overflow: 'hidden',
  },
  controlsArena: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 8px',
  },
  controlClusterLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  controlClusterRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
};
