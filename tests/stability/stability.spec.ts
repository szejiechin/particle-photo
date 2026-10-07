import { _electron as electron, expect, test } from '@playwright/test';
import path from 'node:path';

test('runs the release scene for five minutes with two minutes of interaction', async () => {
  const fixture = path.resolve('tests/fixtures/images/cats.jpg');
  const app = await electron.launch({ args: ['.', '--debug-hud'] });
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showOpenDialog = () => Promise.resolve({ canceled: false, filePaths: [filePath] });
  }, fixture);
  const window = await app.firstWindow();
  await window.evaluate(() => localStorage.setItem('gesture-guide-seen', 'true'));
  await window.getByRole('button', { name: 'Upload Photo' }).click();
  await expect(window.getByLabel('3D particle canvas')).toBeVisible({ timeout: 45_000 });

  const commandNames = ['Gather', 'Auto Rotate', 'Wave', 'Burst'];
  const samples: number[] = [];
  const started = Date.now();
  let commandIndex = 0;
  while (Date.now() - started < 300_000) {
    if (Date.now() - started < 120_000) {
      await window.getByRole('button', { name: commandNames[commandIndex % commandNames.length], exact: true }).click();
      commandIndex += 1;
    }
    await window.waitForTimeout(2_000);
    samples.push(await window.evaluate(() => Number(document.querySelector<HTMLElement>('.particle-canvas')?.dataset.renderFps ?? 0)));
    await expect(window.getByLabel('3D particle canvas')).toBeVisible();
  }

  const valid = samples.filter((sample) => Number.isFinite(sample) && sample > 0);
  expect(valid.length).toBeGreaterThan(100);
  expect(valid.reduce((sum, sample) => sum + sample, 0) / valid.length).toBeGreaterThanOrEqual(30);
  await app.close();
});

test('replaces the scene twenty times without unbounded process memory growth', async () => {
  const fixtures = Array.from({ length: 20 }, (_, index) => path.resolve(`tests/fixtures/acceptance/image-${String(index + 1).padStart(2, '0')}.jpg`));
  const app = await electron.launch({ args: ['.'] });
  await app.evaluate(({ dialog }, filePaths) => {
    let index = 0;
    dialog.showOpenDialog = () => Promise.resolve({ canceled: false, filePaths: [filePaths[index++]] });
  }, fixtures);
  const window = await app.firstWindow();
  await window.evaluate(() => localStorage.setItem('gesture-guide-seen', 'true'));
  const memorySamples: number[] = [];

  for (let index = 0; index < fixtures.length; index += 1) {
    if (index === 0) {
      await window.getByRole('button', { name: 'Upload Photo' }).click();
    } else {
      await window.getByRole('button', { name: 'Upload', exact: true }).click();
      await window.getByRole('button', { name: 'Choose Photo' }).click();
    }
    await expect(window.getByRole('heading', { name: 'Generating particle scene' })).toBeVisible();
    await expect(window.getByLabel('3D particle canvas')).toBeVisible({ timeout: 45_000 });
    memorySamples.push(await app.evaluate(({ app: electronApp }) => electronApp.getAppMetrics().reduce((total, metric) => total + metric.memory.workingSetSize, 0)));
  }

  const baseline = Math.max(...memorySamples.slice(0, 3));
  const final = Math.max(...memorySamples.slice(-3));
  expect(final - baseline).toBeLessThan(1_048_576);
  await app.close();
});
