import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/renderer/App';

describe('App', () => {
  beforeEach(() => {
    window.desktop = {
      openImageFile: vi.fn().mockResolvedValue(null),
      setFullscreen: vi.fn().mockResolvedValue(false),
      openCameraSettings: vi.fn().mockResolvedValue(undefined),
      getAppInfo: vi.fn().mockResolvedValue({ version: '0.1.0', platform: 'win32' }),
    };
  });

  it('renders the English empty state', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '3D Particle Photo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload Photo' })).toBeInTheDocument();
    expect(screen.getByText('or drop a JPG or PNG here')).toBeInTheDocument();
  });
});
