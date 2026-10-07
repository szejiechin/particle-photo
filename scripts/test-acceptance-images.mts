import { env, pipeline, RawImage } from '@huggingface/transformers';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

env.localModelPath = `${path.resolve('public/models').replaceAll('\\', '/')}/`;
env.allowLocalModels = true;
env.allowRemoteModels = false;

const folder = path.resolve('tests/fixtures/acceptance');
const images = (await readdir(folder)).filter((file) => /\.(jpg|jpeg|png)$/i.test(file)).sort();
if (images.length < 20) throw new Error(`Expected 20 acceptance images, found ${images.length}`);

const estimator = await pipeline('depth-estimation', 'onnx-community/depth-anything-v2-small-ONNX', { device: 'cpu', dtype: 'q4' });
const results: Array<{ file: string; ok: boolean; durationMs: number; depthRange?: number; error?: string }> = [];
for (const file of images) {
  const started = performance.now();
  try {
    const output = await estimator(await RawImage.read(path.join(folder, file)));
    if (Array.isArray(output)) throw new Error('Unexpected batched result');
    const values = output.predicted_depth.data as Float32Array;
    let min = Infinity;
    let max = -Infinity;
    for (const value of values) { min = Math.min(min, value); max = Math.max(max, value); }
    const depthRange = max - min;
    if (!Number.isFinite(depthRange) || depthRange <= 0.001) throw new Error('Depth map is flat or invalid');
    results.push({ file, ok: true, durationMs: Math.round(performance.now() - started), depthRange });
  } catch (error) {
    results.push({ file, ok: false, durationMs: Math.round(performance.now() - started), error: error instanceof Error ? error.message : String(error) });
  }
}

await mkdir(path.resolve('docs'), { recursive: true });
await writeFile(path.resolve('docs/acceptance-image-results.json'), JSON.stringify(results, null, 2));
const passed = results.filter((result) => result.ok).length;
console.log(`${passed}/${results.length} images generated a valid non-flat depth map.`);
if (passed < 18) throw new Error('PRD B-01 acceptance threshold was not met');
