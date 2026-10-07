import { describe, expect, it } from 'vitest';
import { PerformanceGuard } from '../../src/renderer/features/particles/performanceGuard';

describe('PerformanceGuard', () => {
  it('warns only after sustained low throughput and recovers after a healthy sample', () => {
    const guard = new PerformanceGuard(30, 3);
    expect(guard.update(29)).toBe(false);
    expect(guard.update(20)).toBe(false);
    expect(guard.update(45)).toBe(false);
    expect(guard.update(15)).toBe(false);
    expect(guard.update(16)).toBe(false);
    expect(guard.update(17)).toBe(true);
  });
});
