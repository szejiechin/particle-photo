import { describe, expect, it } from 'vitest';
import { initialInteractionState, interactionReducer } from '../../src/renderer/state/interactionState';

describe('interaction reducer', () => {
  it('reverses gather and scatter without jumping to a stable state', () => {
    const scattering = interactionReducer(initialInteractionState, { type: 'SCATTER_REQUESTED' });
    expect(scattering.photo).toBe('scattering');
    const gathering = interactionReducer(scattering, { type: 'GATHER_REQUESTED' });
    expect(gathering.photo).toBe('gathering');
  });

  it('exits auto tilt for gather', () => {
    const rotating = interactionReducer(initialInteractionState, { type: 'ROTATE_TOGGLED' });
    const gathering = interactionReducer(rotating, { type: 'GATHER_REQUESTED' });
    expect(gathering.mode).toBe('idle');
  });

  it('increments wave id without changing photo state', () => {
    const waved = interactionReducer(initialInteractionState, { type: 'WAVE_REQUESTED' });
    expect(waved.waveId).toBe(1);
    expect(waved.photo).toBe('gathered');
  });

  it('toggles auto tilt and exits it with Escape', () => {
    const rotating = interactionReducer(initialInteractionState, { type: 'ROTATE_TOGGLED' });
    expect(rotating.mode).toBe('rotate');
    expect(interactionReducer(rotating, { type: 'ESC_PRESSED' }).mode).toBe('idle');
  });

  it('tracks Burst as the retained one-shot animation', () => {
    const burst = interactionReducer(initialInteractionState, { type: 'BURST_REQUESTED' });
    expect(burst).toMatchObject({ burstId: 1 });
  });
});
