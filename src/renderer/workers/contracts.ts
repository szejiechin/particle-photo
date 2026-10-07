export type DepthWorkerRequest =
  | { type: 'analyze'; jobId: number; bytes: ArrayBuffer; mimeType: string }
  | { type: 'cancel'; jobId: number };

export type DepthWorkerResponse =
  | { type: 'progress'; jobId: number; stage: 'loading-model' | 'estimating-depth' }
  | { type: 'result'; jobId: number; width: number; height: number; values: Float32Array; durationMs: number }
  | { type: 'error'; jobId: number; message: string };
