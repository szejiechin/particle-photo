import type { DepthMap } from './types';

export function normalizeDepth(
  values: ArrayLike<number>,
  width: number,
  height: number,
  invert = false,
): DepthMap {
  if (width <= 0 || height <= 0 || values.length !== width * height) {
    throw new RangeError('Depth dimensions do not match the values length');
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < values.length; i += 1) {
    const value = Number(values[i]);
    if (!Number.isFinite(value)) continue;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new TypeError('Depth map contains no finite values');
  }

  const range = max - min;
  const normalized = new Float32Array(values.length);
  for (let i = 0; i < values.length; i += 1) {
    const source = Number(values[i]);
    const unit = range <= Number.EPSILON || !Number.isFinite(source) ? 0.5 : (source - min) / range;
    normalized[i] = invert ? 1 - unit : unit;
  }
  return { width, height, values: normalized };
}

export function deriveSubjectWeights(depth: DepthMap): Float32Array {
  const sorted = Array.from(depth.values).sort((a, b) => b - a);
  const nearThreshold = sorted[Math.floor(sorted.length * 0.35)] ?? 0.5;
  const weights = new Float32Array(depth.values.length);
  const cx = (depth.width - 1) / 2;
  const cy = (depth.height - 1) / 2;
  const maxRadius = Math.hypot(cx, cy) || 1;

  for (let y = 0; y < depth.height; y += 1) {
    for (let x = 0; x < depth.width; x += 1) {
      const index = y * depth.width + x;
      const proximity = Math.max(0, (depth.values[index] - nearThreshold) / Math.max(0.001, 1 - nearThreshold));
      const centrality = 1 - Math.min(1, Math.hypot(x - cx, y - cy) / maxRadius);
      weights[index] = Math.min(1, 0.15 + proximity * 0.65 + centrality * 0.2);
    }
  }
  return weights;
}

export function sampleDepthBilinear(depth: DepthMap, u: number, v: number): number {
  const x = Math.max(0, Math.min(depth.width - 1, u * (depth.width - 1)));
  const y = Math.max(0, Math.min(depth.height - 1, v * (depth.height - 1)));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(depth.width - 1, x0 + 1);
  const y1 = Math.min(depth.height - 1, y0 + 1);
  const tx = x - x0;
  const ty = y - y0;
  const top = depth.values[y0 * depth.width + x0] * (1 - tx) + depth.values[y0 * depth.width + x1] * tx;
  const bottom = depth.values[y1 * depth.width + x0] * (1 - tx) + depth.values[y1 * depth.width + x1] * tx;
  return top * (1 - ty) + bottom * ty;
}
