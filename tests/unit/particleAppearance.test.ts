import { describe, expect, it } from 'vitest';
import { particleSizeUniform, projectedParticleDiameter } from '../../src/renderer/features/particles/appearance';

describe('3D particle appearance', () => {
  it('keeps individual particles visible without merging into oversized flat discs', () => {
    expect(particleSizeUniform(0)).toBe(1.8);
    expect(particleSizeUniform(1)).toBe(6);
    expect(projectedParticleDiameter(0.48, 3.2)).toBeGreaterThan(5);
    expect(projectedParticleDiameter(0.48, 3.2)).toBeLessThan(8);
  });

  it('clamps particle-size settings before projection', () => {
    expect(particleSizeUniform(-1)).toBe(1.8);
    expect(particleSizeUniform(2)).toBe(6);
  });
});
