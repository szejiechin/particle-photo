import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type { SelectedImageFile } from '../shared/contracts/desktop';

export function registerIpcHandlers(): void {
  ipcMain.handle('dialog:open-image', async (): Promise<SelectedImageFile | null> => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png'] }],
    });
    if (result.canceled || result.filePaths.length !== 1) return null;
    const path = result.filePaths[0];
    const bytes = await readFile(path);
    return { name: basename(path), path, bytes: new Uint8Array(bytes) };
  });

  ipcMain.handle('window:set-fullscreen', (event, enabled: unknown): boolean => {
    if (typeof enabled !== 'boolean') throw new TypeError('enabled must be a boolean');
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return false;
    window.setFullScreen(enabled);
    return window.isFullScreen();
  });

  ipcMain.handle('app:get-info', () => ({ version: app.getVersion(), platform: process.platform }));
  ipcMain.handle('system:open-camera-settings', async (): Promise<void> => {
    await shell.openExternal('ms-settings:privacy-webcam');
  });
}
