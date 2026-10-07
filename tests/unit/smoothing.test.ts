import { describe, expect, it } from 'vitest';
import { smoothPoint } from '../../src/renderer/features/camera/smoothing';

describe('smoothPoint', () => {
  it('uses the first point as an anchor and exponentially smooths later movement', () => {
    expect(smoothPoint(null, { x: 0.2, y: 0.4 })).toEqual({ x: 0.2, y: 0.4 });
    expect(smoothPoint({ x: 0, y: 1 }, { x: 1, y: 0 }, 0.25)).toEqual({ x: 0.25, y: 0.75 });
  });

  it('clamps the smoothing factor', () => {
    expect(smoothPoint({ x: 0, y: 0 }, { x: 1, y: 1 }, 2)).toEqual({ x: 1, y: 1 });
  });
});
