import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopApi } from '../shared/contracts/desktop';

const api: DesktopApi = {
  openImageFile: () => ipcRenderer.invoke('dialog:open-image'),
  setFullscreen: (enabled) => ipcRenderer.invoke('window:set-fullscreen', enabled),
  openCameraSettings: () => ipcRenderer.invoke('system:open-camera-settings'),
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
};

contextBridge.exposeInMainWorld('desktop', api);
