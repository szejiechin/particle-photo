import { _electron as electron } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const fixture = path.resolve('tests/fixtures/images/cats.jpg');
const frontOutput = path.resolve('docs/evidence/glowing-particles-front.png');
const sideOutput = path.resolve('docs/evidence/glowing-particles-side.png');
await mkdir(path.dirname(frontOutput), { recursive: true });

const app = await electron.launch({ args: ['.'] });
try {
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showOpenDialog = () => Promise.resolve({ canceled: false, filePaths: [filePath] });
  }, fixture);
  const window = await app.firstWindow();
  await window.evaluate(() => localStorage.setItem('gesture-guide-seen', 'true'));
  await window.getByRole('button', { name: 'Upload Photo' }).click();
  await window.getByLabel('3D particle canvas').waitFor({ state: 'visible', timeout: 45_000 });
  await window.screenshot({ path: frontOutput });
  const canvas = window.getByLabel('3D particle canvas').locator('canvas');
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Particle canvas has no bounds');
  await window.mouse.move(bounds.x + bounds.width * 0.55, bounds.y + bounds.height * 0.5);
  await window.mouse.down();
  await window.mouse.move(bounds.x + bounds.width * 0.78, bounds.y + bounds.height * 0.5, { steps: 12 });
  await window.mouse.up();
  await window.waitForTimeout(350);
  await window.screenshot({ path: sideOutput });
  console.log(frontOutput);
  console.log(sideOutput);
} finally {
  await app.close();
}
