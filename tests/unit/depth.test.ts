import { describe, expect, it } from 'vitest';
import { deriveSubjectWeights, normalizeDepth, sampleDepthBilinear } from '../../src/renderer/features/analysis/depth';

describe('depth utilities', () => {
  it('normalizes finite depth into 0..1', () => {
    const depth = normalizeDepth([10, 20, 30, 40], 2, 2);
    const expected = [0, 1 / 3, 2 / 3, 1];
    Array.from(depth.values).forEach((value, index) => {
      expect(value).toBeCloseTo(expected[index], 6);
    });
  });

  it('uses a stable midpoint for a flat map', () => {
    expect(Array.from(normalizeDepth([3, 3], 2, 1).values)).toEqual([0.5, 0.5]);
  });

  it('samples depth bilinearly', () => {
    const depth = normalizeDepth([0, 1, 1, 0], 2, 2);
    expect(sampleDepthBilinear(depth, 0.5, 0.5)).toBeCloseTo(0.5);
  });

  it('assigns stronger weights to near central pixels', () => {
    const depth = normalizeDepth([0, 0, 0, 0, 10, 0, 0, 0, 0], 3, 3);
    const weights = deriveSubjectWeights(depth);
    expect(weights[4]).toBeGreaterThan(weights[0]);
  });
});
