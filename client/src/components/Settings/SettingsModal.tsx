import React, { useState } from 'react';
import {
  X,
  Wifi,
  Palette,
  Vibrate,
  Sliders,
  ShieldCheck,
  Check,
} from 'lucide-react';
import type { ControllerSettings, ConnectionStatus, ThemeMode, AccentColor } from '../../types/controller';
import { networkService } from '../../services/networkService';
import { haptics } from '../../services/hapticsService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ControllerSettings;
  onUpdateSettings: (settings: Partial<ControllerSettings>) => void;
  connectionStatus: ConnectionStatus;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  connectionStatus,
}) => {
  const [hostInput, setHostInput] = useState(settings.host);
  const [portInput, setPortInput] = useState(settings.port.toString());
  const [activeTab, setActiveTab] = useState<'network' | 'theme' | 'haptics' | 'controls'>('network');

  if (!isOpen) return null;

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    haptics.impactMedium();
    const port = parseInt(portInput, 10) || 8765;
    onUpdateSettings({ host: hostInput, port });
    networkService.connect(hostInput, port);
  };

  const handleDisconnect = () => {
    haptics.impactLight();
    networkService.disconnect(true);
  };

  const themes: { id: ThemeMode; label: string; desc: string }[] = [
    { id: 'amoled', label: 'AMOLED Pure Black', desc: '100% #000000 pitch black for OLED battery efficiency' },
    { id: 'cyberpunk', label: 'Cyberpunk Obsidian', desc: 'Deep purple-tinted darkness' },
    { id: 'matrix', label: 'Emerald Matrix', desc: 'Terminal phosphor darkness' },
  ];

  const accents: { id: AccentColor; label: string; hex: string }[] = [
    { id: 'cyan', label: 'Neon Cyan', hex: '#00f0ff' },
    { id: 'purple', label: 'Cyber Purple', hex: '#b026ff' },
    { id: 'emerald', label: 'Deep Emerald', hex: '#00ff88' },
    { id: 'amber', label: 'Solar Amber', hex: '#ffaa00' },
  ];

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.titleGroup}>
            <h2 style={styles.title}>Settings & Configuration</h2>
            <span style={styles.subtitle}>ZeroAxisPad v1.0.0 (MIT)</span>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Selector */}
        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tabBtn,
              borderBottomColor: activeTab === 'network' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'network' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            }}
            onClick={() => setActiveTab('network')}
          >
            <Wifi size={14} />
            <span>Connection</span>
          </button>

          <button
            style={{
              ...styles.tabBtn,
              borderBottomColor: activeTab === 'theme' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'theme' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            }}
            onClick={() => setActiveTab('theme')}
          >
            <Palette size={14} />
            <span>Theme & Accent</span>
          </button>

          <button
            style={{
              ...styles.tabBtn,
              borderBottomColor: activeTab === 'haptics' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'haptics' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            }}
            onClick={() => setActiveTab('haptics')}
          >
            <Vibrate size={14} />
            <span>Haptics</span>
          </button>

          <button
            style={{
              ...styles.tabBtn,
              borderBottomColor: activeTab === 'controls' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'controls' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            }}
            onClick={() => setActiveTab('controls')}
          >
            <Sliders size={14} />
            <span>Sensitivities</span>
          </button>
        </div>

        {/* Tab Body */}
        <div style={styles.body}>
          {/* TAB 1: NETWORK & PAIRING */}
          {activeTab === 'network' && (
            <div style={styles.tabSection}>
              {/* Connection Status Card */}
              <div style={styles.card}>
                <div style={styles.cardRow}>
                  <span style={styles.cardLabel}>Link Status:</span>
                  <span
                    style={{
                      ...styles.cardValue,
                      color:
                        connectionStatus.state === 'connected'
                          ? 'var(--accent-primary)'
                          : connectionStatus.state === 'connecting'
                          ? '#eab308'
                          : '#ef4444',
                    }}
                  >
                    {connectionStatus.state.toUpperCase()}
                  </span>
                </div>
                {connectionStatus.state === 'connected' && (
                  <>
                    <div style={styles.cardRow}>
                      <span style={styles.cardLabel}>Round-Trip Latency:</span>
                      <span style={styles.cardValue}>{connectionStatus.rtt} ms</span>
                    </div>
                    <div style={styles.cardRow}>
                      <span style={styles.cardLabel}>Packets Transmitted:</span>
                      <span style={styles.cardValue}>
                        Tx: {connectionStatus.packetsSent} &bull; Rx: {connectionStatus.packetsReceived}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Pairing Form */}
              <form onSubmit={handleConnect} style={styles.form}>
                <label style={styles.fieldLabel}>
                  Host PC IP Address:
                  <input
                    type="text"
                    value={hostInput}
                    onChange={(e) => setHostInput(e.target.value)}
                    placeholder="e.g. 192.168.1.100"
                    style={styles.textInput}
                    required
                  />
                </label>

                <label style={styles.fieldLabel}>
                  WebSocket Port:
                  <input
                    type="number"
                    value={portInput}
                    onChange={(e) => setPortInput(e.target.value)}
                    placeholder="8765"
                    style={styles.textInput}
                    required
                  />
                </label>

                <div style={styles.actionButtonGroup}>
                  <button type="submit" style={styles.primaryBtn}>
                    Connect to Host
                  </button>

                  {connectionStatus.state === 'connected' && (
                    <button
                      type="button"
                      style={styles.dangerBtn}
                      onClick={handleDisconnect}
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              </form>

              {/* Zero Telemetry Guarantee */}
              <div style={styles.noticeBox}>
                <ShieldCheck size={18} color="var(--accent-primary)" />
                <span style={styles.noticeText}>
                  <strong>100% Local-First & Zero Telemetry:</strong> All communication travels directly over your local Wi-Fi between your phone and your PC. No third-party servers, no analytics, no accounts.
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: THEME & ACCENT ENGINE */}
          {activeTab === 'theme' && (
            <div style={styles.tabSection}>
              <h4 style={styles.sectionHeading}>Base Theme Engine</h4>
              <div style={styles.themeGrid}>
                {themes.map((t) => (
                  <button
                    key={t.id}
                    style={{
                      ...styles.themeCard,
                      borderColor: settings.theme === t.id ? 'var(--accent-primary)' : 'var(--border-light)',
                      backgroundColor: settings.theme === t.id ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
                    }}
                    onClick={() => {
                      haptics.impactLight();
                      onUpdateSettings({ theme: t.id });
                    }}
                  >
                    <div style={styles.themeCardHeader}>
                      <span style={styles.themeCardLabel}>{t.label}</span>
                      {settings.theme === t.id && <Check size={16} color="var(--accent-primary)" />}
                    </div>
                    <span style={styles.themeCardDesc}>{t.desc}</span>
                  </button>
                ))}
              </div>

              <h4 style={{ ...styles.sectionHeading, marginTop: '16px' }}>Accent Palette</h4>
              <div style={styles.accentGrid}>
                {accents.map((acc) => (
                  <button
                    key={acc.id}
                    style={{
                      ...styles.accentButton,
                      borderColor: settings.accent === acc.id ? acc.hex : 'var(--border-light)',
                      backgroundColor: settings.accent === acc.id ? 'var(--bg-elevated)' : 'var(--bg-card)',
                    }}
                    onClick={() => {
                      haptics.impactLight();
                      onUpdateSettings({ accent: acc.id });
                    }}
                  >
                    <div style={{ ...styles.accentColorOrb, backgroundColor: acc.hex }} />
                    <span style={styles.accentLabel}>{acc.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: HAPTIC FEEDBACK ENGINE */}
          {activeTab === 'haptics' && (
            <div style={styles.tabSection}>
              <div style={styles.settingToggleRow}>
                <div>
                  <div style={styles.toggleTitle}>Enable Haptic Feedback</div>
                  <div style={styles.toggleDesc}>Tactile vibration on buttons, d-pad, and analog sticks</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.hapticsEnabled}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    onUpdateSettings({ hapticsEnabled: checked });
                    haptics.setEnabled(checked);
                  }}
                  style={styles.checkbox}
                />
              </div>

              {settings.hapticsEnabled && (
                <>
                  <h4 style={{ ...styles.sectionHeading, marginTop: '16px' }}>Vibration Intensity</h4>
                  <div style={styles.intensityRow}>
                    {(['light', 'medium', 'heavy'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        style={{
                          ...styles.intensityBtn,
                          backgroundColor:
                            settings.hapticIntensity === lvl ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                          color: settings.hapticIntensity === lvl ? '#000' : 'var(--text-secondary)',
                        }}
                        onClick={() => {
                          onUpdateSettings({ hapticIntensity: lvl });
                          haptics.setIntensity(lvl);
                          haptics.impactHeavy();
                        }}
                      >
                        {lvl.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  <button
                    style={styles.testVibeBtn}
                    onClick={() => {
                      haptics.impactHeavy();
                    }}
                  >
                    Test Haptic Pulse
                  </button>
                </>
              )}
            </div>
          )}

          {/* TAB 4: CONTROLS & SENSITIVITIES */}
          {activeTab === 'controls' && (
            <div style={styles.tabSection}>
              <div style={styles.sliderControl}>
                <div style={styles.sliderHeader}>
                  <span>Trackpad Cursor Speed:</span>
                  <span style={styles.sliderValue}>{settings.trackpadSensitivity}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={settings.trackpadSensitivity}
                  onChange={(e) => onUpdateSettings({ trackpadSensitivity: parseFloat(e.target.value) })}
                  style={styles.rangeSlider}
                />
              </div>

              <div style={styles.sliderControl}>
                <div style={styles.sliderHeader}>
                  <span>Air Mouse (Gyro Pointer) Speed:</span>
                  <span style={styles.sliderValue}>{settings.airMouseSensitivity}x</span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="3.0"
                  step="0.1"
                  value={settings.airMouseSensitivity}
                  onChange={(e) => onUpdateSettings({ airMouseSensitivity: parseFloat(e.target.value) })}
                  style={styles.rangeSlider}
                />
              </div>

              <div style={styles.sliderControl}>
                <div style={styles.sliderHeader}>
                  <span>Motion Steering Sensitivity:</span>
                  <span style={styles.sliderValue}>{settings.gyroSensitivity}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={settings.gyroSensitivity}
                  onChange={(e) => onUpdateSettings({ gyroSensitivity: parseFloat(e.target.value) })}
                  style={styles.rangeSlider}
                />
              </div>

              <div style={styles.sliderControl}>
                <div style={styles.sliderHeader}>
                  <span>Motion Steering Deadzone:</span>
                  <span style={styles.sliderValue}>{settings.gyroDeadzone}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={settings.gyroDeadzone}
                  onChange={(e) => onUpdateSettings({ gyroDeadzone: parseFloat(e.target.value) })}
                  style={styles.rangeSlider}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300,
    backdropFilter: 'blur(6px)',
    padding: '16px',
  },
  modal: {
    width: '100%',
    maxWidth: '540px',
    maxHeight: '90vh',
    backgroundColor: 'var(--bg-surface)',
    borderRadius: '16px',
    border: '1px solid var(--border-light)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-lg)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border-light)',
  },
  titleGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  subtitle: {
    fontSize: '11px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent-primary)',
  },
  closeBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-elevated)',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid var(--border-light)',
    backgroundColor: 'var(--bg-surface)',
    overflowX: 'auto',
  },
  tabBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '12px 10px',
    background: 'transparent',
    borderBottom: '2px solid transparent',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  body: {
    padding: '20px',
    overflowY: 'auto',
    flex: 1,
  },
  tabSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  card: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '10px',
    border: '1px solid var(--border-light)',
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  cardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
  },
  cardLabel: {
    color: 'var(--text-secondary)',
  },
  cardValue: {
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  fieldLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  textInput: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border-light)',
    backgroundColor: 'var(--bg-elevated)',
    color: '#fff',
    fontSize: '14px',
    fontFamily: 'var(--font-mono)',
    outline: 'none',
  },
  actionButtonGroup: {
    display: 'flex',
    gap: '10px',
    marginTop: '6px',
  },
  primaryBtn: {
    flex: 1,
    padding: '10px',
    borderRadius: '8px',
    backgroundColor: 'var(--accent-primary)',
    color: '#000',
    fontSize: '13px',
    fontWeight: 700,
  },
  dangerBtn: {
    padding: '10px 16px',
    borderRadius: '8px',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    fontSize: '13px',
    fontWeight: 700,
  },
  noticeBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    border: '1px solid var(--border-light)',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
  },
  noticeText: {
    flex: 1,
  },
  sectionHeading: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  themeGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  themeCard: {
    padding: '12px',
    borderRadius: '8px',
    border: '1.5px solid',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    cursor: 'pointer',
  },
  themeCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  themeCardLabel: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  themeCardDesc: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  accentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  accentButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1.5px solid',
    cursor: 'pointer',
  },
  accentColorOrb: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    boxShadow: '0 0 8px currentColor',
  },
  accentLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  settingToggleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    border: '1px solid var(--border-light)',
  },
  toggleTitle: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  toggleDesc: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    accentColor: 'var(--accent-primary)',
  },
  intensityRow: {
    display: 'flex',
    gap: '8px',
  },
  intensityBtn: {
    flex: 1,
    padding: '8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  testVibeBtn: {
    padding: '10px',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-light)',
    color: 'var(--text-primary)',
    fontSize: '12px',
    fontWeight: 600,
    marginTop: '8px',
  },
  sliderControl: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sliderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  sliderValue: {
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent-primary)',
    fontWeight: 700,
  },
  rangeSlider: {
    accentColor: 'var(--accent-primary)',
    height: '6px',
    cursor: 'pointer',
  },
};
