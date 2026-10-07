import { _electron as electron, expect, test } from '@playwright/test';
import path from 'node:path';

test('launches the packaged application shell', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();
  await expect(window).toHaveTitle('Particle Photo');
  await expect(window.getByRole('heading', { name: '3D Particle Photo' })).toBeVisible();
  const baselineFps = await window.evaluate(async () => {
    let frames = 0;
    const started = performance.now();
    await new Promise<void>((resolve) => {
      const tick = (now: number) => {
        frames += 1;
        if (now - started >= 1_000) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return frames / ((performance.now() - started) / 1_000);
  });
  console.log(`Empty-window presentation baseline: ${baselineFps.toFixed(1)} FPS`);
  await app.close();
});

test('uploads a local photo and creates the particle workspace offline', async () => {
  test.setTimeout(60_000);
  const fixture = path.resolve('tests/fixtures/images/cats.jpg');
  const app = await electron.launch({ args: ['.', '--debug-hud'] });
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showOpenDialog = () => Promise.resolve({ canceled: false, filePaths: [filePath] });
  }, fixture);
  const window = await app.firstWindow();
  await window.evaluate(() => {
    localStorage.clear();
    (window as unknown as { __particleBenchmark?: boolean }).__particleBenchmark = true;
  });
  await window.getByRole('button', { name: 'Upload Photo' }).click();
  await expect(window.getByRole('heading', { name: 'Generating particle scene' })).toBeVisible();
  await expect(window.getByLabel('3D particle canvas')).toBeVisible({ timeout: 45_000 });
  await expect(window.getByRole('button', { name: 'Gather' })).toBeVisible();
  await expect(window.getByRole('button', { name: 'Auto Rotate' })).toBeVisible();
  await expect(window.getByRole('button', { name: 'Wave' })).toBeVisible();
  await expect(window.getByRole('button', { name: 'Burst' })).toBeVisible();
  await expect(window.getByLabel('Interaction controls').getByRole('button')).toHaveCount(4);
  await expect(window.getByRole('slider')).toHaveCount(6);
  await expect(window.getByLabel('Performance metrics')).toContainText('particles');
  await window.getByRole('button', { name: 'Upload', exact: true }).click();
  await expect(window.getByRole('dialog', { name: 'Replace current photo?' })).toBeVisible();
  await window.getByRole('button', { name: 'Cancel' }).click();
  await expect(window.getByRole('dialog', { name: 'Replace current photo?' })).toBeHidden();
  const fps = await window.evaluate(async () => {
    let frames = 0;
    const started = performance.now();
    await new Promise<void>((resolve) => {
      const tick = (now: number) => {
        frames += 1;
        if (now - started >= 2_000) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return frames / ((performance.now() - started) / 1_000);
  });
  const rendererInfo = await window.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('.particle-canvas canvas');
    const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
    const extension = gl?.getExtension('WEBGL_debug_renderer_info');
    return extension && gl ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  const renderFps = await window.getByLabel('3D particle canvas').evaluate((element) => Number((element as HTMLElement).dataset.renderFps));
  console.log(`Measured renderer: ${rendererInfo}; presentation FPS: ${fps.toFixed(1)}; render throughput: ${renderFps.toFixed(1)} FPS`);
  expect(renderFps).toBeGreaterThanOrEqual(30);
  await window.getByRole('button', { name: 'Fullscreen' }).click();
  await expect(window.getByRole('button', { name: 'Upload' })).toBeHidden();
  await expect(window.getByRole('button', { name: 'Exit Fullscreen' })).toBeVisible();
  await window.keyboard.press('Escape');
  await expect(window.getByRole('button', { name: 'Upload' })).toBeVisible();
  await app.close();
});

test('runs the four retained animations with bounded auto tilt', async () => {
  test.setTimeout(60_000);
  const fixture = path.resolve('tests/fixtures/images/cats.jpg');
  const app = await electron.launch({ args: ['.'] });
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showOpenDialog = () => Promise.resolve({ canceled: false, filePaths: [filePath] });
  }, fixture);
  const window = await app.firstWindow();
  await window.getByRole('button', { name: 'Upload Photo' }).click();
  await expect(window.getByLabel('3D particle canvas')).toBeVisible({ timeout: 45_000 });
  await window.getByRole('button', { name: 'Auto Rotate' }).click();
  await expect(window.getByRole('button', { name: 'Auto Rotate' })).toHaveClass(/is-active/);
  const samples: Array<{ x: number; y: number }> = [];
  for (let index = 0; index < 4; index += 1) {
    await window.waitForTimeout(500);
    samples.push(await window.getByLabel('3D particle canvas').evaluate((element) => ({
      x: Number((element as HTMLElement).dataset.rotationX),
      y: Number((element as HTMLElement).dataset.rotationY),
    })));
  }
  expect(Math.max(...samples.map(({ x }) => Math.abs(x)))).toBeLessThanOrEqual(0.061);
  expect(Math.max(...samples.map(({ y }) => Math.abs(y)))).toBeLessThanOrEqual(0.121);
  expect(new Set(samples.map(({ x, y }) => `${x.toFixed(4)}:${y.toFixed(4)}`)).size).toBeGreaterThan(1);
  await window.getByRole('button', { name: 'Wave' }).click();
  await window.getByRole('button', { name: 'Burst' }).click();
  await window.getByRole('button', { name: 'Gather' }).click();
  await expect(window.getByLabel('3D particle canvas')).toBeVisible();
  await expect(window.getByLabel('Webcam preview')).toHaveCount(0);
  await app.close();
});
