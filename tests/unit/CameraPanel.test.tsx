import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CameraPanel } from '../../src/renderer/features/camera/CameraPanel';

describe('CameraPanel recovery', () => {
  beforeEach(() => {
    window.desktop = {
      openImageFile: vi.fn().mockResolvedValue(null),
      setFullscreen: vi.fn().mockResolvedValue(false),
      openCameraSettings: vi.fn().mockResolvedValue(undefined),
      getAppInfo: vi.fn().mockResolvedValue({ version: '0.1.0', platform: 'win32' }),
    };
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        enumerateDevices: vi.fn().mockResolvedValue([]),
        getUserMedia: vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError')),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });
  });

  it('keeps the workspace recoverable after permission is denied', async () => {
    render(<CameraPanel dispatch={vi.fn()} onStatus={vi.fn()} onHandMove={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Turn On' }));
    expect(await screen.findByText('Camera permission is required')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Open Camera Settings' }));
    expect(window.desktop.openCameraSettings).toHaveBeenCalledOnce();
  });
});
