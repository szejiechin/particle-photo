/// <reference lib="webworker" />
import { env, pipeline, RawImage } from '@huggingface/transformers';
import type { DepthEstimationPipeline } from '@huggingface/transformers';
import { normalizeDepth } from '../features/analysis/depth';
import type { DepthWorkerRequest, DepthWorkerResponse } from './contracts';

const scope = self as unknown as DedicatedWorkerGlobalScope;
const cancelled = new Set<number>();
let estimatorPromise: Promise<DepthEstimationPipeline> | null = null;

env.localModelPath = new URL('../models/', scope.location.href).href;
env.allowRemoteModels = false;
env.allowLocalModels = true;

function send(message: DepthWorkerResponse, transfer: Transferable[] = []): void {
  scope.postMessage(message, transfer);
}

async function estimator(): Promise<DepthEstimationPipeline> {
  estimatorPromise ??= pipeline(
    'depth-estimation',
    'onnx-community/depth-anything-v2-small-ONNX',
    { device: 'webgpu', dtype: 'q4' },
  ) as Promise<DepthEstimationPipeline>;
  try {
    return await estimatorPromise;
  } catch {
    estimatorPromise = pipeline(
      'depth-estimation',
      'onnx-community/depth-anything-v2-small-ONNX',
      { device: 'wasm', dtype: 'q4' },
    ) as Promise<DepthEstimationPipeline>;
    return estimatorPromise;
  }
}

scope.onmessage = async (event: MessageEvent<DepthWorkerRequest>) => {
  const request = event.data;
  if (request.type === 'cancel') {
    cancelled.add(request.jobId);
    return;
  }

  const started = performance.now();
  try {
    send({ type: 'progress', jobId: request.jobId, stage: 'loading-model' });
    const model = await estimator();
    if (cancelled.delete(request.jobId)) return;
    send({ type: 'progress', jobId: request.jobId, stage: 'estimating-depth' });
    const image = await RawImage.fromBlob(new Blob([request.bytes], { type: request.mimeType }));
    const output = await model(image);
    if (Array.isArray(output)) throw new Error('Unexpected batched depth result');
    if (cancelled.delete(request.jobId)) return;
    const normalized = normalizeDepth(
      output.predicted_depth.data as Float32Array,
      output.predicted_depth.dims.at(-1) ?? output.depth.width,
      output.predicted_depth.dims.at(-2) ?? output.depth.height,
    );
    send(
      {
        type: 'result',
        jobId: request.jobId,
        width: normalized.width,
        height: normalized.height,
        values: normalized.values,
        durationMs: performance.now() - started,
      },
      [normalized.values.buffer],
    );
  } catch (error) {
    send({
      type: 'error',
      jobId: request.jobId,
      message: error instanceof Error ? error.message : 'Depth estimation failed',
    });
  }
};
