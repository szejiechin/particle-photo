import { useState } from 'react';
import { defaultSettings, semanticValue, type ParticleSettings } from './settings';

interface ControlsPanelProps {
  settings: ParticleSettings;
  onChange(next: ParticleSettings): void;
}

const controls: Array<{ key: keyof ParticleSettings; label: string }> = [
  { key: 'density', label: 'Particle Density' },
  { key: 'particleSize', label: 'Particle Size' },
  { key: 'depthStrength', label: 'Depth Strength' },
  { key: 'backgroundStrength', label: 'Background Strength' },
  { key: 'floatingStrength', label: 'Floating Strength' },
  { key: 'animationSpeed', label: 'Animation Speed' },
];

export function ControlsPanel({ settings, onChange }: ControlsPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside className={`controls-panel ${collapsed ? 'collapsed' : ''}`} aria-label="Particle controls">
      <button className="panel-toggle" type="button" onClick={() => setCollapsed((value) => !value)} aria-expanded={!collapsed}>
        {collapsed ? 'Controls ›' : '‹ Controls'}
      </button>
      {!collapsed && (
        <div className="control-list">
          {controls.map(({ key, label }) => (
            <label key={key}>
              <span><strong>{label}</strong><em>{semanticValue(settings[key])}</em></span>
              <input
                aria-label={label}
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings[key]}
                onChange={(event) => onChange({ ...settings, [key]: Number(event.target.value) })}
              />
            </label>
          ))}
          <button className="secondary-button" type="button" onClick={() => onChange(defaultSettings)}>Reset Parameters</button>
        </div>
      )}
    </aside>
  );
}
