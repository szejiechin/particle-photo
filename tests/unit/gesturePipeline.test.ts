import { describe, expect, it } from 'vitest';
import { gestureToInteraction } from '../../src/renderer/features/gestures/commands';
import { GestureStabilizer, responsiveGestureOptions } from '../../src/renderer/features/gestures/stabilizer';

describe('responsive gesture command pipeline', () => {
  it('turns a briefly noisy fist into one Gather command within one second', () => {
    const stabilizer = new GestureStabilizer(responsiveGestureOptions);
    const samples = [
      { name: 'Closed_Fist' as const, confidence: 0.68, timestamp: 0, handPresent: true },
      { name: 'None' as const, confidence: 0.2, timestamp: 90, handPresent: true },
      { name: 'Closed_Fist' as const, confidence: 0.51, timestamp: 180, handPresent: true },
      { name: 'Closed_Fist' as const, confidence: 0.57, timestamp: 360, handPresent: true },
      { name: 'Closed_Fist' as const, confidence: 0.61, timestamp: 430, handPresent: true },
    ];
    const commands = samples.flatMap((sample) => stabilizer.update(sample))
      .filter((event) => event.type === 'confirmed')
      .map((event) => gestureToInteraction(event.gesture));
    expect(commands).toEqual([{ type: 'GATHER_REQUESTED' }]);
  });
});
