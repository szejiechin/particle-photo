export interface PixelImage {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
}

export interface DepthMap {
  width: number;
  height: number;
  values: Float32Array;
}

export interface AnalysisResult {
  image: PixelImage;
  depth: DepthMap;
  subjectWeights: Float32Array;
  durationMs: number;
}
