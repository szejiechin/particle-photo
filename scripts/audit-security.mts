import { readFile } from 'node:fs/promises';

const main = await readFile('src/main/main.ts', 'utf8');
const preload = await readFile('src/preload/preload.ts', 'utf8');
const ipc = await readFile('src/main/ipc.ts', 'utf8');

const requirements: Array<[boolean, string]> = [
  [main.includes('nodeIntegration: false'), 'nodeIntegration must be disabled'],
  [main.includes('contextIsolation: true'), 'contextIsolation must be enabled'],
  [main.includes('sandbox: true'), 'Renderer sandbox must be enabled'],
  [preload.includes('contextBridge.exposeInMainWorld'), 'preload must use contextBridge'],
  [!preload.includes('ipcRenderer.send('), 'preload must not expose arbitrary send'],
  [ipc.includes("typeof enabled !== 'boolean'"), 'fullscreen IPC must validate its argument'],
  [ipc.includes("shell.openExternal('ms-settings:privacy-webcam')"), 'legacy camera settings IPC must use a fixed URI'],
];

const failures = requirements.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) throw new Error(`Security audit failed:\n${failures.join('\n')}`);
console.log(`Security audit passed (${requirements.length} checks).`);
