export interface SelectedImageFile {
  name: string;
  path: string;
  bytes: Uint8Array;
}

export interface AppInfo {
  version: string;
  platform: NodeJS.Platform;
}

export interface DesktopApi {
  openImageFile(): Promise<SelectedImageFile | null>;
  setFullscreen(enabled: boolean): Promise<boolean>;
  /** @deprecated Retained only for recoverable legacy-source compatibility. */
  openCameraSettings(): Promise<void>;
  getAppInfo(): Promise<AppInfo>;
}
