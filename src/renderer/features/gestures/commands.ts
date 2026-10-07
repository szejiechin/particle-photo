import type { InteractionEvent } from '../../state/interactionState';
import type { GestureName } from './stabilizer';

export function gestureToInteraction(gesture: GestureName): InteractionEvent | null {
  switch (gesture) {
    case 'Closed_Fist': return { type: 'GATHER_REQUESTED' };
    case 'Open_Palm': return { type: 'SCATTER_REQUESTED' };
    case 'Victory': return { type: 'ROTATE_TOGGLED' };
    case 'Pointing_Up': return { type: 'WAVE_REQUESTED' };
    case 'Thumb_Up': return { type: 'PAUSE_TOGGLED' };
    case 'None': return null;
  }
}

export const gestureLabels: Record<GestureName, string> = {
  None: 'No Gesture',
  Closed_Fist: 'Fist',
  Open_Palm: 'Open Palm',
  Victory: 'V Sign',
  Pointing_Up: 'Point',
  Thumb_Up: 'Thumb Up',
};

export const gestureCommandLabels: Record<Exclude<GestureName, 'None'>, string> = {
  Closed_Fist: 'Gather',
  Open_Palm: 'Scatter',
  Victory: 'Rotate Mode',
  Pointing_Up: 'Wave',
  Thumb_Up: 'Pause / Resume',
};
