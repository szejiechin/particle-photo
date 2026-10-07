import { env, pipeline } from '@huggingface/transformers';
import { performance } from 'node:perf_hooks';

env.cacheDir = './assets/models/cache';
env.allowRemoteModels = true;

const model = 'onnx-community/depth-anything-v2-small-ONNX';
const source = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/cats.jpg';
const started = performance.now();
const estimator = await pipeline('depth-estimation', model, { device: 'cpu', dtype: 'q4' });
const loaded = performance.now();
const result = await estimator(source);
const finished = performance.now();

console.log(JSON.stringify({
  model,
  loadMs: Math.round(loaded - started),
  inferenceMs: Math.round(finished - loaded),
  width: result.depth.width,
  height: result.depth.height,
}, null, 2));
