import { useEffect, useState, useRef, useCallback } from 'react';
import type { MotionData, MotionCalibration } from '../types/controller';

export type { MotionData };

interface MotionControllerOptions {
  enabled?: boolean;
  smoothing?: number; // 0 (raw) to 0.95 (heavy smoothing), default 0.25
  pollRateFps?: number; // target fps for throttling (default 60)
}

export function useMotionController(
  enabled: boolean = false,
  options: MotionControllerOptions = {}
) {
  const { smoothing = 0.2, pollRateFps = 60 } = options;

  const [motion, setMotion] = useState<MotionData>({
    pitch: 0,
    roll: 0,
    yaw: 0,
    supported: false,
    permissionGranted: false,
    accelX: 0,
    accelY: 0,
    accelZ: 0,
  });

  const [calibration, setCalibration] = useState<MotionCalibration>({
    pitchOffset: 0,
    rollOffset: 0,
    yawOffset: 0,
  });

  // Reference values for smoothing and RAF throttling
  const rawMotionRef = useRef<{ pitch: number; roll: number; yaw: number; ax: number; ay: number; az: number }>({
    pitch: 0,
    roll: 0,
    yaw: 0,
    ax: 0,
    ay: 0,
    az: 0,
  });

  const filteredRef = useRef<{ pitch: number; roll: number; yaw: number }>({
    pitch: 0,
    roll: 0,
    yaw: 0,
  });

  const calibrationRef = useRef(calibration);
  calibrationRef.current = calibration;

  const rafIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const frameIntervalMs = 1000 / pollRateFps;

  // Center / calibrate current orientation as 0, 0, 0
  const calibrate = useCallback(() => {
    setCalibration({
      pitchOffset: rawMotionRef.current.pitch,
      rollOffset: rawMotionRef.current.roll,
      yawOffset: rawMotionRef.current.yaw,
    });
  }, []);

  // Reset calibration
  const resetCalibration = useCallback(() => {
    setCalibration({
      pitchOffset: 0,
      rollOffset: 0,
      yawOffset: 0,
    });
  }, []);

  // Request permission (especially needed for iOS 13+ devices)
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const DeviceOrientation = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (typeof DeviceOrientation?.requestPermission === 'function') {
      try {
        const response = await DeviceOrientation.requestPermission();
        const granted = response === 'granted';
        setMotion((prev) => ({ ...prev, permissionGranted: granted }));
        return granted;
      } catch (err) {
        console.warn('DeviceOrientation permission request error:', err);
        return false;
      }
    }
    // Non-iOS or older browsers don't require permission call
    setMotion((prev) => ({ ...prev, permissionGranted: true }));
    return true;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let isSupported = false;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      isSupported = true;
      const rawPitch = event.beta ?? 0;   // [-180, 180]
      const rawRoll = event.gamma ?? 0;   // [-90, 90]
      const rawYaw = event.alpha ?? 0;    // [0, 360]

      rawMotionRef.current.pitch = rawPitch;
      rawMotionRef.current.roll = rawRoll;
      rawMotionRef.current.yaw = rawYaw;
    };

    const handleMotion = (event: DeviceMotionEvent) => {
      if (event.accelerationIncludingGravity) {
        rawMotionRef.current.ax = event.accelerationIncludingGravity.x ?? 0;
        rawMotionRef.current.ay = event.accelerationIncludingGravity.y ?? 0;
        rawMotionRef.current.az = event.accelerationIncludingGravity.z ?? 0;
      }
    };

    if (window.DeviceOrientationEvent) {
      isSupported = true;
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', handleMotion, true);
    }

    // RAF loop with throttling to avoid flooding React state and WebSocket messages
    const loop = (timestamp: number) => {
      if (timestamp - lastUpdateRef.current >= frameIntervalMs) {
        lastUpdateRef.current = timestamp;

        const currentRaw = rawMotionRef.current;
        const cal = calibrationRef.current;

        // Apply calibration offsets
        let targetPitch = currentRaw.pitch - cal.pitchOffset;
        let targetRoll = currentRaw.roll - cal.rollOffset;
        let targetYaw = currentRaw.yaw - cal.yawOffset;

        // Clamp / wrap normalized angles
        if (targetPitch > 180) targetPitch -= 360;
        if (targetPitch < -180) targetPitch += 360;
        if (targetRoll > 90) targetRoll = 90;
        if (targetRoll < -90) targetRoll = -90;
        if (targetYaw < 0) targetYaw += 360;
        if (targetYaw >= 360) targetYaw -= 360;

        // Apply EMA filter
        const alpha = 1 - smoothing;
        filteredRef.current.pitch += (targetPitch - filteredRef.current.pitch) * alpha;
        filteredRef.current.roll += (targetRoll - filteredRef.current.roll) * alpha;
        filteredRef.current.yaw += (targetYaw - filteredRef.current.yaw) * alpha;

        setMotion({
          pitch: Number(filteredRef.current.pitch.toFixed(2)),
          roll: Number(filteredRef.current.roll.toFixed(2)),
          yaw: Number(filteredRef.current.yaw.toFixed(2)),
          supported: isSupported,
          accelX: Number(currentRaw.ax.toFixed(2)),
          accelY: Number(currentRaw.ay.toFixed(2)),
          accelZ: Number(currentRaw.az.toFixed(2)),
        });
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (isSupported) {
        window.removeEventListener('deviceorientation', handleOrientation, true);
      }
      window.removeEventListener('devicemotion', handleMotion, true);
    };
  }, [enabled, smoothing, frameIntervalMs]);

  /**
   * Helper: Maps roll or yaw tilt to a normalized steering axis [-1.0, 1.0]
   * with configurable deadzone, sensitivity, and max angle.
   */
  const getSteeringValue = useCallback(
    (axis: 'roll' | 'yaw' = 'roll', sensitivity = 1.0, deadzoneDeg = 2.0, maxAngleDeg = 45): number => {
      const angle = axis === 'roll' ? motion.roll : motion.yaw > 180 ? motion.yaw - 360 : motion.yaw;
      const absAngle = Math.abs(angle);

      if (absAngle <= deadzoneDeg) return 0;

      const effectiveAngle = Math.sign(angle) * (absAngle - deadzoneDeg);
      const normalized = effectiveAngle / (maxAngleDeg - deadzoneDeg);
      const scaled = normalized * sensitivity;

      return Math.max(-1.0, Math.min(1.0, scaled));
    },
    [motion.roll, motion.yaw]
  );

  return {
    ...motion,
    calibrate,
    resetCalibration,
    requestPermission,
    getSteeringValue,
    calibration,
  };
}
