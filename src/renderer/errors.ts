export type AppErrorCode =
  | 'UNSUPPORTED_IMAGE'
  | 'IMAGE_DECODE_FAILED'
  | 'ANALYSIS_CANCELLED'
  | 'DEPTH_MODEL_LOAD_FAILED'
  | 'DEPTH_INFERENCE_FAILED'
  | 'PARTICLE_BUILD_FAILED'
  | 'OUT_OF_MEMORY';

const errorCopy: Record<AppErrorCode, string> = {
  UNSUPPORTED_IMAGE: 'Unable to open this image. Please choose a valid JPG or PNG file.',
  IMAGE_DECODE_FAILED: 'Unable to decode this image. Please choose another JPG or PNG file.',
  ANALYSIS_CANCELLED: 'Image analysis was cancelled.',
  DEPTH_MODEL_LOAD_FAILED: 'The local depth model could not be loaded. Try again.',
  DEPTH_INFERENCE_FAILED: 'Unable to estimate depth for this image. Try another photo.',
  PARTICLE_BUILD_FAILED: 'Unable to build the particle scene. Try lowering Particle Density.',
  OUT_OF_MEMORY: 'There is not enough memory for this scene. Try lowering Particle Density.',
};

export class AppError extends Error {
  constructor(readonly code: AppErrorCode, options?: ErrorOptions) {
    super(errorCopy[code], options);
    this.name = 'AppError';
  }
}

export function messageForError(error: unknown, fallback: string): string {
  if (error instanceof AppError) return errorCopy[error.code];
  if (error instanceof DOMException && error.name === 'AbortError') return errorCopy.ANALYSIS_CANCELLED;
  return error instanceof Error && error.message ? error.message : fallback;
}
