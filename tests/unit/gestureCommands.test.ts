import { describe, expect, it } from 'vitest';
import { gestureToInteraction } from '../../src/renderer/features/gestures/commands';

describe('gesture command mapping', () => {
  it('maps every approved gesture to its product command', () => {
    expect(gestureToInteraction('Closed_Fist')).toEqual({ type: 'GATHER_REQUESTED' });
    expect(gestureToInteraction('Open_Palm')).toEqual({ type: 'SCATTER_REQUESTED' });
    expect(gestureToInteraction('Victory')).toEqual({ type: 'ROTATE_TOGGLED' });
    expect(gestureToInteraction('Pointing_Up')).toEqual({ type: 'WAVE_REQUESTED' });
    expect(gestureToInteraction('Thumb_Up')).toEqual({ type: 'PAUSE_TOGGLED' });
    expect(gestureToInteraction('None')).toBeNull();
  });
});
