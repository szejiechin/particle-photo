import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ControlsPanel } from '../../src/renderer/features/controls/ControlsPanel';
import { defaultSettings } from '../../src/renderer/features/controls/settings';

describe('ControlsPanel', () => {
  it('renders all six controls and resets settings', async () => {
    const onChange = vi.fn();
    render(<ControlsPanel settings={{ ...defaultSettings, depthStrength: 1 }} onChange={onChange} />);
    expect(screen.getAllByRole('slider')).toHaveLength(6);
    await userEvent.click(screen.getByRole('button', { name: 'Reset Parameters' }));
    expect(onChange).toHaveBeenCalledWith(defaultSettings);
  });

  it('collapses without losing the toggle', async () => {
    render(<ControlsPanel settings={defaultSettings} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '‹ Controls' }));
    expect(screen.queryAllByRole('slider')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Controls ›' })).toBeVisible();
  });
});
