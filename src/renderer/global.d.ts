import type { DesktopApi } from '../shared/contracts/desktop';

declare global {
  interface Window {
    desktop: DesktopApi;
    __particleBenchmark?: boolean;
  }
}

export {};
