import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Volume1,
  Camera,
  Radio,
  Mic,
  MicOff,
  Copy,
  Clipboard,
  Layers,
  Monitor,
  XCircle,
  Plus,
  Trash2,
  Tv,
  Gamepad,
  Sparkles,
} from 'lucide-react';
import type { MacroTile } from '../../types/controller';
import { networkService } from '../../services/networkService';
import { haptics } from '../../services/hapticsService';

const DEFAULT_MACROS: MacroTile[] = [
  // Media Cluster
  {
    id: 'media_play_pause',
    label: 'Play / Pause',
    sublabel: 'Media',
    icon: 'Play',
    category: 'media',
    keys: ['play_pause'],
    color: '#00f0ff',
  },
  {
    id: 'media_prev',
    label: 'Previous',
    sublabel: 'Media',
    icon: 'SkipBack',
    category: 'media',
    keys: ['prev_track'],
    color: '#00f0ff',
  },
  {
    id: 'media_next',
    label: 'Next Track',
    sublabel: 'Media',
    icon: 'SkipForward',
    category: 'media',
    keys: ['next_track'],
    color: '#00f0ff',
  },
  {
    id: 'vol_up',
    label: 'Volume Up',
    sublabel: '+2%',
    icon: 'Volume2',
    category: 'media',
    keys: ['volume_up'],
    color: '#00f0ff',
  },
  {
    id: 'vol_down',
    label: 'Volume Down',
    sublabel: '-2%',
    icon: 'Volume1',
    category: 'media',
    keys: ['volume_down'],
    color: '#00f0ff',
  },
  {
    id: 'vol_mute',
    label: 'Mute Audio',
    sublabel: 'Toggle',
    icon: 'VolumeX',
    category: 'media',
    keys: ['volume_mute'],
    color: '#ef4444',
  },

  // Streaming & Gaming
  {
    id: 'discord_mute',
    label: 'Discord Mute',
    sublabel: 'Ctrl+Shift+M',
    icon: 'MicOff',
    category: 'gaming',
    keys: ['ctrl', 'shift', 'm'],
    color: '#b026ff',
  },
  {
    id: 'discord_deafen',
    label: 'Discord Deafen',
    sublabel: 'Ctrl+Shift+D',
    icon: 'Mic',
    category: 'gaming',
    keys: ['ctrl', 'shift', 'd'],
    color: '#b026ff',
  },
  {
    id: 'screenshot',
    label: 'Screenshot',
    sublabel: 'Win+Shift+S',
    icon: 'Camera',
    category: 'gaming',
    keys: ['win', 'shift', 's'],
    color: '#00ff88',
  },
  {
    id: 'game_bar',
    label: 'Xbox Bar',
    sublabel: 'Win+G',
    icon: 'Gamepad',
    category: 'gaming',
    keys: ['win', 'g'],
    color: '#00ff88',
  },
  {
    id: 'obs_record',
    label: 'OBS Record',
    sublabel: 'F9 / Toggle',
    icon: 'Radio',
    category: 'gaming',
    keys: ['f9'],
    color: '#ef4444',
  },

  // System & Productivity
  {
    id: 'alt_tab',
    label: 'Alt + Tab',
    sublabel: 'App Switch',
    icon: 'Layers',
    category: 'productivity',
    keys: ['alt', 'tab'],
    color: '#ffaa00',
  },
  {
    id: 'task_mgr',
    label: 'Task Manager',
    sublabel: 'Ctrl+Shift+Esc',
    icon: 'Monitor',
    category: 'productivity',
    keys: ['ctrl', 'shift', 'esc'],
    color: '#ffaa00',
  },
  {
    id: 'show_desktop',
    label: 'Show Desktop',
    sublabel: 'Win+D',
    icon: 'Tv',
    category: 'productivity',
    keys: ['win', 'd'],
    color: '#ffaa00',
  },
  {
    id: 'copy',
    label: 'Copy',
    sublabel: 'Ctrl+C',
    icon: 'Copy',
    category: 'productivity',
    keys: ['ctrl', 'c'],
    color: '#3b82f6',
  },
  {
    id: 'paste',
    label: 'Paste',
    sublabel: 'Ctrl+V',
    icon: 'Clipboard',
    category: 'productivity',
    keys: ['ctrl', 'v'],
    color: '#3b82f6',
  },
  {
    id: 'close_app',
    label: 'Close Window',
    sublabel: 'Alt+F4',
    icon: 'XCircle',
    category: 'productivity',
    keys: ['alt', 'f4'],
    color: '#ef4444',
  },
];

export const MacroDeckView: React.FC = () => {
  const [macros, setMacros] = useState<MacroTile[]>(() => {
    const saved = localStorage.getItem('zeroaxispad_macros');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_MACROS;
      }
    }
    return DEFAULT_MACROS;
  });

  const [activeCategory, setActiveCategory] = useState<'all' | 'media' | 'gaming' | 'productivity' | 'custom'>('all');
  const [isCreatingTile, setIsCreatingTile] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newSublabel, setNewSublabel] = useState('');
  const [newKeys, setNewKeys] = useState('');
  const [newCategory, setNewCategory] = useState<'media' | 'gaming' | 'productivity' | 'custom'>('custom');

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('zeroaxispad_macros', JSON.stringify(macros));
  }, [macros]);

  const handleTrigger = (tile: MacroTile) => {
    haptics.impactMedium();
    networkService.sendMacro(tile.id, tile.keys);
  };

  const handleAddMacro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel || !newKeys) return;

    const parsedKeys = newKeys.split('+').map((k) => k.trim().toLowerCase());
    const newTile: MacroTile = {
      id: `custom_${Date.now()}`,
      label: newLabel,
      sublabel: newSublabel || newKeys,
      icon: 'Sparkles',
      category: newCategory,
      keys: parsedKeys,
      color: 'var(--accent-primary)',
    };

    setMacros((prev) => [...prev, newTile]);
    setNewLabel('');
    setNewSublabel('');
    setNewKeys('');
    setIsCreatingTile(false);
    haptics.notificationSuccess();
  };

  const handleDeleteTile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.impactLight();
    setMacros((prev) => prev.filter((m) => m.id !== id));
  };

  const getIcon = (iconName: string, color: string) => {
    const props = { size: 22, color: color || 'var(--text-primary)' };
    switch (iconName) {
      case 'Play': return <Play {...props} />;
      case 'Pause': return <Pause {...props} />;
      case 'SkipForward': return <SkipForward {...props} />;
      case 'SkipBack': return <SkipBack {...props} />;
      case 'Volume2': return <Volume2 {...props} />;
      case 'Volume1': return <Volume1 {...props} />;
      case 'VolumeX': return <VolumeX {...props} />;
      case 'Mic': return <Mic {...props} />;
      case 'MicOff': return <MicOff {...props} />;
      case 'Camera': return <Camera {...props} />;
      case 'Radio': return <Radio {...props} />;
      case 'Layers': return <Layers {...props} />;
      case 'Monitor': return <Monitor {...props} />;
      case 'Tv': return <Tv {...props} />;
      case 'Gamepad': return <Gamepad {...props} />;
      case 'Copy': return <Copy {...props} />;
      case 'Clipboard': return <Clipboard {...props} />;
      case 'XCircle': return <XCircle {...props} />;
      default: return <Sparkles {...props} />;
    }
  };

  const filteredMacros = activeCategory === 'all'
    ? macros
    : macros.filter((m) => m.category === activeCategory);

  return (
    <div style={styles.container}>
      {/* Category Pills & Add Macro Button */}
      <div style={styles.filterBar}>
        <div style={styles.categoryPills}>
          {(['all', 'media', 'gaming', 'productivity', 'custom'] as const).map((cat) => (
            <button
              key={cat}
              style={{
                ...styles.filterBtn,
                backgroundColor: activeCategory === cat ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                color: activeCategory === cat ? '#000' : 'var(--text-secondary)',
              }}
              onClick={() => {
                haptics.impactLight();
                setActiveCategory(cat);
              }}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>

        <button
          style={styles.addBtn}
          onClick={() => {
            haptics.impactLight();
            setIsCreatingTile(true);
          }}
          title="Create New Macro Tile"
        >
          <Plus size={16} />
          <span>New Tile</span>
        </button>
      </div>

      {/* Grid of Macro Tiles */}
      <div style={styles.grid}>
        {filteredMacros.map((tile) => (
          <button
            key={tile.id}
            style={{
              ...styles.macroTile,
              borderLeft: `4px solid ${tile.color || 'var(--accent-primary)'}`,
            }}
            onClick={() => handleTrigger(tile)}
          >
            <div style={styles.tileHeader}>
              <div style={styles.tileIcon}>
                {getIcon(tile.icon, tile.color || 'var(--accent-primary)')}
              </div>
              {tile.category === 'custom' && (
                <button
                  style={styles.deleteBtn}
                  onClick={(e) => handleDeleteTile(tile.id, e)}
                  title="Delete Tile"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            <span style={styles.tileLabel}>{tile.label}</span>
            {tile.sublabel && <span style={styles.tileSublabel}>{tile.sublabel}</span>}
          </button>
        ))}
      </div>

      {/* New Macro Modal Dialog */}
      {isCreatingTile && (
        <div style={styles.modalOverlay} onClick={() => setIsCreatingTile(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Add Custom Shortcut Tile</h3>
            <form onSubmit={handleAddMacro} style={styles.form}>
              <label style={styles.inputLabel}>
                Button Title:
                <input
                  type="text"
                  placeholder="e.g. Mute Mic, Open Spotify"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  style={styles.textInput}
                  required
                />
              </label>

              <label style={styles.inputLabel}>
                Shortcut Keys (joined with +):
                <input
                  type="text"
                  placeholder="e.g. ctrl+alt+t, win+r, f5"
                  value={newKeys}
                  onChange={(e) => setNewKeys(e.target.value)}
                  style={styles.textInput}
                  required
                />
              </label>

              <label style={styles.inputLabel}>
                Category:
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  style={styles.selectInput}
                >
                  <option value="custom">Custom</option>
                  <option value="gaming">Gaming</option>
                  <option value="media">Media</option>
                  <option value="productivity">Productivity</option>
                </select>
              </label>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.cancelBtn}
                  onClick={() => setIsCreatingTile(false)}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.saveBtn}>
                  Save Shortcut
                </button>
              </div>
            </form>
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
    padding: '8px 12px',
    overflow: 'hidden',
    gap: '8px',
  },
  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  categoryPills: {
    display: 'flex',
    gap: '6px',
    overflowX: 'auto',
  },
  filterBtn: {
    padding: '5px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '5px 12px',
    borderRadius: '6px',
    backgroundColor: 'var(--accent-dim)',
    color: 'var(--accent-primary)',
    border: '1px solid var(--accent-border)',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  grid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
    gridAutoRows: '95px',
    gap: '8px',
    overflowY: 'auto',
    paddingRight: '4px',
  },
  macroTile: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '10px',
    border: '1px solid var(--border-light)',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'transform 0.08s ease, background-color 0.15s',
  },
  tileHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  tileIcon: {
    display: 'flex',
    alignItems: 'center',
  },
  deleteBtn: {
    background: 'transparent',
    color: 'var(--text-muted)',
    padding: '2px',
    cursor: 'pointer',
  },
  tileLabel: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: 1.2,
    marginTop: '4px',
  },
  tileSublabel: {
    fontSize: '10px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    backdropFilter: 'blur(4px)',
  },
  modalContent: {
    width: '90%',
    maxWidth: '380px',
    backgroundColor: 'var(--bg-surface)',
    borderRadius: '14px',
    border: '1px solid var(--border-light)',
    padding: '20px',
    boxShadow: 'var(--shadow-lg)',
  },
  modalTitle: {
    fontSize: '16px',
    fontWeight: 700,
    marginBottom: '16px',
    color: 'var(--text-primary)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  inputLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  textInput: {
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid var(--border-light)',
    backgroundColor: 'var(--bg-elevated)',
    color: '#fff',
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none',
  },
  selectInput: {
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid var(--border-light)',
    backgroundColor: 'var(--bg-elevated)',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '10px',
  },
  cancelBtn: {
    padding: '8px 14px',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '13px',
  },
  saveBtn: {
    padding: '8px 16px',
    borderRadius: '6px',
    backgroundColor: 'var(--accent-primary)',
    color: '#000',
    fontSize: '13px',
    fontWeight: 700,
  },
};
