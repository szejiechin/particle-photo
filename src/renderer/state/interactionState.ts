export type PhotoState = 'gathered' | 'gathering' | 'scattering' | 'scattered';
export type InteractionMode = 'idle' | 'rotate';

export interface InteractionState {
  photo: PhotoState;
  mode: InteractionMode;
  waveId: number;
  burstId: number;
}

export type InteractionEvent =
  | { type: 'GATHER_REQUESTED' }
  | { type: 'SCATTER_REQUESTED' }
  | { type: 'ROTATE_TOGGLED' }
  | { type: 'WAVE_REQUESTED' }
  | { type: 'BURST_REQUESTED' }
  | { type: 'PAUSE_TOGGLED' }
  | { type: 'HAND_LOST' }
  | { type: 'HAND_FOUND' }
  | { type: 'HAND_LOST_TIMEOUT' }
  | { type: 'ESC_PRESSED' }
  | { type: 'ANIMATION_COMPLETED' };

export const initialInteractionState: InteractionState = {
  photo: 'gathered',
  mode: 'idle',
  waveId: 0,
  burstId: 0,
};

export function interactionReducer(
  state: InteractionState,
  event: InteractionEvent,
): InteractionState {
  switch (event.type) {
    case 'GATHER_REQUESTED':
      return { ...state, photo: 'gathering', mode: 'idle' };
    case 'SCATTER_REQUESTED':
      return { ...state, photo: 'scattering', mode: 'idle' };
    case 'ROTATE_TOGGLED':
      return { ...state, mode: state.mode === 'rotate' ? 'idle' : 'rotate' };
    case 'WAVE_REQUESTED':
      return { ...state, waveId: state.waveId + 1 };
    case 'BURST_REQUESTED':
      return { ...state, burstId: state.burstId + 1 };
    case 'ESC_PRESSED':
      return { ...state, mode: 'idle' };
    case 'PAUSE_TOGGLED':
    case 'HAND_LOST':
    case 'HAND_FOUND':
    case 'HAND_LOST_TIMEOUT':
      return state;
    case 'ANIMATION_COMPLETED':
      if (state.photo === 'gathering') return { ...state, photo: 'gathered' };
      if (state.photo === 'scattering') return { ...state, photo: 'scattered' };
      return state;
  }
}
