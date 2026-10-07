import { describe, expect, it } from 'vitest';
import { particleBudget, semanticValue } from '../../src/renderer/features/controls/settings';

describe('particle settings', () => {
  it('maps density to a bounded particle budget', () => {
    expect(particleBudget(-1)).toBe(25_000);
    expect(particleBudget(0.55)).toBe(80_000);
    expect(particleBudget(2)).toBe(125_000);
  });

  it('provides human-readable semantic values', () => {
    expect(semanticValue(0)).toBe('Very Low');
    expect(semanticValue(0.5)).toBe('Medium');
    expect(semanticValue(1)).toBe('Very High');
  });
});
