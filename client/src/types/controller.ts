export type ControllerMode = 'gamepad' | 'trackpad' | 'gyro' | 'macro' | 'settings';

export type AccentColor = 'cyan' | 'purple' | 'emerald' | 'amber';
export type ThemeMode = 'amoled' | 'cyberpunk' | 'matrix';

export interface MotionData {
  pitch: number; // Beta [-180, 180]
  roll: number;  // Gamma [-90, 90]
  yaw: number;   // Alpha [0, 360]
  supported: boolean;
  permissionGranted?: boolean;
  accelX?: number;
  accelY?: number;
  accelZ?: number;
}

export interface MotionCalibration {
  pitchOffset: number;
  rollOffset: number;
  yawOffset: number;
}

export interface GamepadAxes {
  lx: number; // [-1.0, 1.0]
  ly: number; // [-1.0, 1.0]
  rx: number; // [-1.0, 1.0]
  ry: number; // [-1.0, 1.0]
  lt: number; // [0.0, 1.0]
  rt: number; // [0.0, 1.0]
}

export interface GamepadButtons {
  a: boolean;
  b: boolean;
  x: boolean;
  y: boolean;
  dpad_up: boolean;
  dpad_down: boolean;
  dpad_left: boolean;
  dpad_right: boolean;
  lb: boolean;
  rb: boolean;
  l3: boolean;
  r3: boolean;
  select: boolean;
  start: boolean;
  guide: boolean;
}

export interface GamepadState {
  axes: GamepadAxes;
  buttons: GamepadButtons;
}

export interface MacroTile {
  id: string;
  label: string;
  sublabel?: string;
  icon: string;
  category: 'media' | 'gaming' | 'productivity' | 'custom';
  keys: string[]; // e.g. ['ctrl', 'c'] or special key like 'volume_up'
  color?: string;
}

export interface ControllerSettings {
  host: string;
  port: number;
  theme: ThemeMode;
  accent: AccentColor;
  hapticsEnabled: boolean;
  hapticIntensity: 'light' | 'medium' | 'heavy';
  gyroSteeringEnabled: boolean;
  gyroSteeringAxis: 'roll' | 'yaw';
  gyroSensitivity: number; // 0.1 to 3.0
  gyroDeadzone: number;    // 0 to 15 degrees
  gyroInvert: boolean;
  airMouseSensitivity: number; // 0.2 to 3.0
  trackpadSensitivity: number; // 0.5 to 2.5
  vibrateOnTouch: boolean;
}

export interface ConnectionStatus {
  state: 'disconnected' | 'connecting' | 'connected' | 'error';
  rtt: number; // latency in ms
  serverAddress: string;
  packetsSent: number;
  packetsReceived: number;
  lastError?: string;
}
