import { describe, expect, it } from 'vitest';
import { GestureStabilizer } from '../../src/renderer/features/gestures/stabilizer';

describe('GestureStabilizer', () => {
  it('requires a stable hold before confirmation', () => {
    const stabilizer = new GestureStabilizer({ holdMs: 600, releaseMs: 150, confidenceThreshold: 0.7 });
    expect(stabilizer.update({ name: 'Open_Palm', confidence: 0.9, timestamp: 0, handPresent: true })[0]?.type).toBe('candidate');
    expect(stabilizer.update({ name: 'Open_Palm', confidence: 0.9, timestamp: 599, handPresent: true })).toEqual([]);
    expect(stabilizer.update({ name: 'Open_Palm', confidence: 0.9, timestamp: 600, handPresent: true })[0]).toEqual({ type: 'confirmed', gesture: 'Open_Palm' });
  });

  it('latches a confirmed gesture until neutral release', () => {
    const stabilizer = new GestureStabilizer({ holdMs: 100, releaseMs: 100, confidenceThreshold: 0.7 });
    stabilizer.update({ name: 'Thumb_Up', confidence: 1, timestamp: 0, handPresent: true });
    stabilizer.update({ name: 'Thumb_Up', confidence: 1, timestamp: 100, handPresent: true });
    expect(stabilizer.update({ name: 'Thumb_Up', confidence: 1, timestamp: 500, handPresent: true })).toEqual([]);
    stabilizer.update({ name: 'None', confidence: 1, timestamp: 600, handPresent: true });
    expect(stabilizer.update({ name: 'None', confidence: 1, timestamp: 700, handPresent: true })[0]).toEqual({ type: 'released', gesture: 'Thumb_Up' });
  });

  it('reports hand loss and resets the latch', () => {
    const stabilizer = new GestureStabilizer({ holdMs: 0, releaseMs: 0, confidenceThreshold: 0.5 });
    stabilizer.update({ name: 'Victory', confidence: 1, timestamp: 1, handPresent: true });
    stabilizer.update({ name: 'Victory', confidence: 1, timestamp: 2, handPresent: true });
    expect(stabilizer.update({ name: 'None', confidence: 0, timestamp: 3, handPresent: false })[0]).toEqual({ type: 'hand-lost', gesture: 'Victory' });
  });

  it('tolerates brief low-confidence frame drops while a gesture is held', () => {
    const stabilizer = new GestureStabilizer({ holdMs: 350, releaseMs: 160, confidenceThreshold: 0.42, dropoutGraceMs: 160 });
    stabilizer.update({ name: 'Closed_Fist', confidence: 0.8, timestamp: 0, handPresent: true });
    expect(stabilizer.update({ name: 'None', confidence: 0.1, timestamp: 80, handPresent: true })).toEqual([]);
    expect(stabilizer.update({ name: 'Closed_Fist', confidence: 0.55, timestamp: 360, handPresent: true })).toEqual([{ type: 'confirmed', gesture: 'Closed_Fist' }]);
  });

  it('drops a candidate after the grace period to prevent false triggers', () => {
    const stabilizer = new GestureStabilizer({ holdMs: 350, releaseMs: 160, confidenceThreshold: 0.42, dropoutGraceMs: 120 });
    stabilizer.update({ name: 'Victory', confidence: 0.8, timestamp: 10, handPresent: true });
    stabilizer.update({ name: 'None', confidence: 0.1, timestamp: 200, handPresent: true });
    expect(stabilizer.update({ name: 'Victory', confidence: 0.8, timestamp: 400, handPresent: true })[0]?.type).toBe('candidate');
  });
});
