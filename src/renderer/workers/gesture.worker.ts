/// <reference lib="webworker" />
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';
import type { GestureName } from '../features/gestures/stabilizer';

interface FrameRequest { type: 'frame'; frame: ImageBitmap; timestamp: number }
interface DisposeRequest { type: 'dispose' }
type Request = FrameRequest | DisposeRequest;

const scope = self as unknown as DedicatedWorkerGlobalScope;
let recognizerPromise: Promise<GestureRecognizer> | null = null;

async function getRecognizer(): Promise<GestureRecognizer> {
  const create = async (delegate: 'GPU' | 'CPU') => {
    const fileset = await FilesetResolver.forVisionTasks(new URL('../mediapipe/wasm', scope.location.href).href, true);
    return GestureRecognizer.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: new URL('../models/gesture_recognizer.task', scope.location.href).href, delegate },
      runningMode: 'VIDEO',
      numHands: 1,
      minHandDetectionConfidence: 0.42,
      minHandPresenceConfidence: 0.42,
      minTrackingConfidence: 0.42,
      cannedGesturesClassifierOptions: {
        categoryAllowlist: ['Closed_Fist', 'Open_Palm', 'Victory', 'Pointing_Up', 'Thumb_Up'],
        scoreThreshold: 0.25,
      },
    });
  };
  recognizerPromise ??= (async () => {
    return create('GPU');
  })();
  try {
    return await recognizerPromise;
  } catch {
    recognizerPromise = create('CPU');
    return recognizerPromise;
  }
}

scope.onmessage = async (event: MessageEvent<Request>) => {
  if (event.data.type === 'dispose') {
    if (recognizerPromise) (await recognizerPromise).close();
    recognizerPromise = null;
    return;
  }

  const { frame, timestamp } = event.data;
  try {
    const recognizer = await getRecognizer();
    const inferenceStarted = performance.now();
    const result = recognizer.recognizeForVideo(frame, timestamp);
    const landmarks = result.landmarks[0];
    const category = result.gestures[0]?.[0];
    let center: { x: number; y: number } | null = null;
    if (landmarks) {
      const indices = [0, 5, 9, 13, 17];
      center = indices.reduce((sum, index) => ({ x: sum.x + landmarks[index].x / indices.length, y: sum.y + landmarks[index].y / indices.length }), { x: 0, y: 0 });
    }
    scope.postMessage({
      type: 'result',
      timestamp,
      handPresent: Boolean(landmarks),
      name: (category?.categoryName ?? 'None') as GestureName,
      confidence: category?.score ?? 0,
      center,
      landmarks: landmarks?.map(({ x, y, z }) => ({ x, y, z })) ?? [],
      inferenceMs: performance.now() - inferenceStarted,
    });
  } catch (error) {
    scope.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Gesture recognition failed' });
  } finally {
    frame.close();
    scope.postMessage({ type: 'ready' });
  }
};
