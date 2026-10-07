import { describe, expect, it } from 'vitest';
import { normalizeDepth } from '../../src/renderer/features/analysis/depth';
import { buildParticleBuffers } from '../../src/renderer/features/particles/sampler';

function fixture() {
  const rgba = new Uint8ClampedArray(4 * 4 * 4);
  for (let i = 0; i < 16; i += 1) {
    rgba[i * 4] = i;
    rgba[i * 4 + 1] = 100;
    rgba[i * 4 + 2] = 200;
    rgba[i * 4 + 3] = 255;
  }
  return { width: 4, height: 4, rgba };
}

describe('particle sampler', () => {
  it('builds deterministic bounded buffers', () => {
    const image = fixture();
    const depth = normalizeDepth(Array.from({ length: 16 }, (_, i) => i), 4, 4);
    const weights = new Float32Array(16).fill(1);
    const options = { maxParticles: 8, depthScale: 2, backgroundStrength: 0.4, seed: 42 };
    const a = buildParticleBuffers(image, depth, weights, options);
    const b = buildParticleBuffers(image, depth, weights, options);
    expect(a.count).toBeLessThanOrEqual(8);
    expect(a.count).toBeGreaterThan(0);
    expect(Array.from(a.basePosition)).toEqual(Array.from(b.basePosition));
    expect(Array.from(a.scatterDirection)).toEqual(Array.from(b.scatterDirection));
    expect(a.color).toHaveLength(a.count * 3);
  });

  it('does not create particles for fully transparent input', () => {
    const image = { width: 2, height: 2, rgba: new Uint8ClampedArray(16) };
    const depth = normalizeDepth([0, 1, 0, 1], 2, 2);
    const particles = buildParticleBuffers(image, depth, new Float32Array(4).fill(1), {
      maxParticles: 4,
      depthScale: 1,
      backgroundStrength: 1,
      seed: 1,
    });
    expect(particles.count).toBe(0);
  });

  it('adds a recessed particle backing layer behind the subject', () => {
    const width = 6;
    const height = 6;
    const rgba = new Uint8ClampedArray(width * height * 4).fill(180);
    for (let index = 3; index < rgba.length; index += 4) rgba[index] = 255;
    const values = new Float32Array(width * height).fill(0.15);
    const weights = new Float32Array(width * height).fill(0.1);
    for (const index of [14, 15, 20, 21]) { values[index] = 0.95; weights[index] = 1; }
    const particles = buildParticleBuffers({ width, height, rgba }, { width, height, values }, weights, {
      maxParticles: 100,
      depthScale: 1,
      backgroundStrength: 1,
      seed: 7,
    });
    const depthsByPosition = new Map<string, number[]>();
    for (let index = 0; index < particles.count; index += 1) {
      const offset = index * 3;
      const key = `${particles.basePosition[offset].toFixed(3)},${particles.basePosition[offset + 1].toFixed(3)}`;
      depthsByPosition.set(key, [...(depthsByPosition.get(key) ?? []), particles.basePosition[offset + 2]]);
    }
    expect([...depthsByPosition.values()].some((depths) => depths.length >= 4 && Math.max(...depths) - Math.min(...depths) >= 0.1)).toBe(true);
  });
});
