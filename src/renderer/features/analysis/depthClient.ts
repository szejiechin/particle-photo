import type { DepthMap } from './types';
import type { DepthWorkerRequest, DepthWorkerResponse } from '../../workers/contracts';
import { AppError } from '../../errors';

export type AnalysisStage = 'loading-model' | 'estimating-depth';

export interface DepthJob {
  promise: Promise<{ depth: DepthMap; durationMs: number }>;
  cancel(): void;
}

let nextJobId = 1;

export class DepthClient {
  private worker: Worker | null = null;

  constructor(private readonly factory = () => new Worker(new URL('../../workers/depth.worker.ts', import.meta.url), { type: 'module' })) {}

  analyze(bytes: ArrayBuffer, mimeType: string, onProgress?: (stage: AnalysisStage) => void): DepthJob {
    const jobId = nextJobId++;
    this.worker?.terminate();
    const worker = this.factory();
    this.worker = worker;
    let settled = false;
    let rejectPromise: (reason?: unknown) => void = () => undefined;
    let listener: ((event: MessageEvent<DepthWorkerResponse>) => void) | null = null;

    const release = () => {
      if (listener) worker.removeEventListener('message', listener);
      worker.terminate();
      if (this.worker === worker) this.worker = null;
    };

    const promise = new Promise<{ depth: DepthMap; durationMs: number }>((resolve, reject) => {
      rejectPromise = reject;
      listener = (event: MessageEvent<DepthWorkerResponse>) => {
        const response = event.data;
        if (response.jobId !== jobId) return;
        if (response.type === 'progress') {
          onProgress?.(response.stage);
          return;
        }
        settled = true;
        release();
        if (response.type === 'error') {
          reject(new AppError('DEPTH_INFERENCE_FAILED', { cause: new Error(response.message) }));
        } else {
          resolve({
            depth: { width: response.width, height: response.height, values: response.values },
            durationMs: response.durationMs,
          });
        }
      };
      worker.addEventListener('message', listener);
      const request: DepthWorkerRequest = { type: 'analyze', jobId, bytes, mimeType };
      worker.postMessage(request, [bytes]);
    });

    return {
      promise,
      cancel: () => {
        if (settled) return;
        settled = true;
        const request: DepthWorkerRequest = { type: 'cancel', jobId };
        worker.postMessage(request);
        release();
        rejectPromise(new DOMException('Analysis was cancelled', 'AbortError'));
      },
    };
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}
