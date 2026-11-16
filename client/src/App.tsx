import React, { useState, useEffect, useCallback } from 'react';
import type { ControllerMode, ControllerSettings, ConnectionStatus } from './types/controller';
import { NavigationHeader } from './components/NavigationHeader';
import { GamepadView } from './components/Gamepad/GamepadView';
import { TrackpadView } from './components/Trackpad/TrackpadView';
import { GyroView } from './components/Gyro/GyroView';
import { MacroDeckView } from './components/MacroDeck/MacroDeckView';
import { SettingsModal } from './components/Settings/SettingsModal';
import { useMotionController } from './services/motionService';
import { networkService } from './services/networkService';
import { haptics } from './services/hapticsService';

const DEFAULT_SETTINGS: ControllerSettings = {
  host: typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : '127.0.0.1',
  port: 8765,
  theme: 'amoled',
  accent: 'cyan',
  hapticsEnabled: true,
  hapticIntensity: 'medium',
  gyroSteeringEnabled: false,
  gyroSteeringAxis: 'roll',
  gyroSensitivity: 1.0,
  gyroDeadzone: 2.0,
  gyroInvert: false,
  airMouseSensitivity: 1.0,
  trackpadSensitivity: 1.2,
  vibrateOnTouch: true,
};

export const App: React.FC = () => {
  // Load settings
  const [settings, setSettings] = useState<ControllerSettings>(() => {
    const saved = localStorage.getItem('zeroaxispad_settings');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [currentMode, setCurrentMode] = useState<ControllerMode>('gamepad');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(networkService.getStatus());
  const [showIosPermissionBanner, setShowIosPermissionBanner] = useState<boolean>(false);

  // Motion controller hook
  const motion = useMotionController(true, {
    smoothing: 0.18,
    pollRateFps: 60,
  });

  // Calculate normalized steering value
  const steeringValue = motion.getSteeringValue(
    settings.gyroSteeringAxis,
    settings.gyroSensitivity,
    settings.gyroDeadzone,
    45
  );

  // Apply theme & accent data-attributes to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.setAttribute('data-accent', settings.accent);
  }, [settings.theme, settings.accent]);

  // Sync haptics settings
  useEffect(() => {
    haptics.setEnabled(settings.hapticsEnabled);
    haptics.setIntensity(settings.hapticIntensity);
  }, [settings.hapticsEnabled, settings.hapticIntensity]);

  // Save settings on update
  const handleUpdateSettings = useCallback((partial: Partial<ControllerSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem('zeroaxispad_settings', JSON.stringify(next));
      return next;
    });
  }, []);

  // Subscribe to network connection state
  useEffect(() => {
    const unsubscribe = networkService.subscribeStatus((status) => {
      setConnectionStatus(status);
    });

    // Auto connect
    networkService.connect(settings.host, settings.port);

    return () => {
      unsubscribe();
      networkService.disconnect(false);
    };
  }, []);

  // Check iOS permission requirement
  useEffect(() => {
    const DeviceOrientation = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    if (typeof DeviceOrientation?.requestPermission === 'function' && !motion.permissionGranted) {
      setShowIosPermissionBanner(true);
    }
  }, [motion.permissionGranted]);

  const handleGrantIosPermission = async () => {
    haptics.impactMedium();
    const granted = await motion.requestPermission();
    if (granted) {
      setShowIosPermissionBanner(false);
    }
  };

  return (
    <div style={styles.appContainer}>
      {/* Top Header Bar */}
      <NavigationHeader
        currentMode={currentMode}
        onSelectMode={(mode) => setCurrentMode(mode)}
        connectionStatus={connectionStatus}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onCalibrateGyro={motion.calibrate}
        gyroSupported={motion.supported}
      />

      {/* iOS Gyro Permission Banner if required */}
      {showIosPermissionBanner && (
        <div style={styles.permissionBanner}>
          <span>Motion sensors require iOS permission for steering and air mouse.</span>
          <button style={styles.grantBtn} onClick={handleGrantIosPermission}>
            Enable Motion Sensors
          </button>
        </div>
      )}

      {/* Active Mode View */}
      <main style={styles.mainContent}>
        {currentMode === 'gamepad' && (
          <GamepadView
            settings={settings}
            steeringValue={steeringValue}
            rollDeg={motion.roll}
          />
        )}

        {currentMode === 'trackpad' && (
          <TrackpadView
            settings={settings}
            motion={motion}
            onUpdateSettings={handleUpdateSettings}
          />
        )}

        {currentMode === 'gyro' && (
          <GyroView
            settings={settings}
            motion={motion}
            steeringValue={steeringValue}
            onCalibrate={motion.calibrate}
            onUpdateSettings={handleUpdateSettings}
          />
        )}

        {currentMode === 'macro' && <MacroDeckView />}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        connectionStatus={connectionStatus}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    width: '100%',
    height: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-primary)',
    overflow: 'hidden',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
  },
  permissionBanner: {
    backgroundColor: 'var(--accent-dim)',
    borderBottom: '1px solid var(--accent-border)',
    color: 'var(--accent-primary)',
    padding: '8px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    fontWeight: 600,
  },
  grantBtn: {
    backgroundColor: 'var(--accent-primary)',
    color: '#000',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
  },
};

export default App;
