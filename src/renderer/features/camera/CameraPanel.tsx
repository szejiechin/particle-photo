import { useCallback, useEffect, useRef, useState } from 'react';
import type { InteractionEvent } from '../../state/interactionState';
import { gestureCommandLabels, gestureLabels, gestureToInteraction } from '../gestures/commands';
import { GestureStabilizer, responsiveGestureOptions, type GestureName } from '../gestures/stabilizer';
import { smoothPoint, type Point2D } from './smoothing';

interface WorkerResult {
  type: 'result';
  timestamp: number;
  handPresent: boolean;
  name: GestureName;
  confidence: number;
  center: { x: number; y: number } | null;
  inferenceMs: number;
}

interface CameraPanelProps {
  dispatch(event: InteractionEvent): void;
  onStatus(label: string): void;
  onHandMove(center: { x: number; y: number } | null): void;
  onGestureConfirmed?(label: string): void;
  onInferenceMs?(milliseconds: number): void;
  hidden?: boolean;
}

export function CameraPanel({ dispatch, onStatus, onHandMove, onGestureConfirmed, onInferenceMs, hidden = false }: CameraPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const busyRef = useRef(false);
  const animationRef = useRef(0);
  const lastFrameRef = useRef(0);
  const stabilizerRef = useRef(new GestureStabilizer(responsiveGestureOptions));
  const smoothedCenterRef = useRef<Point2D | null>(null);
  const lastHandPresentRef = useRef(false);
  const dispatchRef = useRef(dispatch);
  const handMoveRef = useRef(onHandMove);
  const [state, setState] = useState<'off' | 'starting' | 'ready' | 'denied' | 'missing' | 'error'>('off');
  const [gesture, setGesture] = useState<GestureName>('None');
  const [confidence, setConfidence] = useState(0);
  const [handPresent, setHandPresent] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  useEffect(() => { dispatchRef.current = dispatch; }, [dispatch]);
  useEffect(() => { handMoveRef.current = onHandMove; }, [onHandMove]);

  const releaseCapture = useCallback(() => {
    cancelAnimationFrame(animationRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    busyRef.current = false;
    handMoveRef.current(null);
    smoothedCenterRef.current = null;
    lastHandPresentRef.current = false;
    workerRef.current?.postMessage({ type: 'dispose' });
    workerRef.current?.terminate();
    workerRef.current = null;
    stabilizerRef.current = new GestureStabilizer(responsiveGestureOptions);
  }, []);

  const stop = useCallback(() => {
    releaseCapture();
    setState('off');
    setHandPresent(false);
    setGesture('None');
    setConfidence(0);
    onStatus('Camera Off');
  }, [onStatus, releaseCapture]);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const cameras = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === 'videoinput');
    setDevices(cameras);
    setSelectedDeviceId((current) => cameras.some((camera) => camera.deviceId === current) ? current : cameras[0]?.deviceId ?? '');
    if (streamRef.current && cameras.length === 0) {
      releaseCapture();
      setState('missing');
      onStatus('No Camera');
    }
  }, [onStatus, releaseCapture]);

  const start = useCallback(async (deviceId = selectedDeviceId) => {
    releaseCapture();
    setState('starting');
    setErrorMessage('');
    onStatus('Camera Starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: deviceId ? { exact: deviceId } : undefined, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } }, audio: false });
      streamRef.current = stream;
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        releaseCapture();
        setState('missing');
        onStatus('Camera Disconnected');
      }, { once: true });
      const video = videoRef.current;
      if (!video) throw new Error('Camera preview is unavailable');
      video.srcObject = stream;
      await video.play();
      const worker = new Worker(new URL('../../workers/gesture.worker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<WorkerResult | { type: 'ready' } | { type: 'error'; message: string }>) => {
        if (event.data.type === 'ready') { busyRef.current = false; return; }
        busyRef.current = false;
        if (event.data.type === 'error') { setErrorMessage(event.data.message); setState('error'); onStatus('Camera Error'); return; }
        const result = event.data;
        onInferenceMs?.(result.inferenceMs);
        if (result.handPresent !== lastHandPresentRef.current) {
          dispatchRef.current({ type: result.handPresent ? 'HAND_FOUND' : 'HAND_LOST' });
          lastHandPresentRef.current = result.handPresent;
        }
        setHandPresent(result.handPresent);
        setGesture(result.name);
        setConfidence(result.confidence);
        const mirrored = result.center ? { x: 1 - result.center.x, y: result.center.y } : null;
        smoothedCenterRef.current = mirrored ? smoothPoint(smoothedCenterRef.current, mirrored) : null;
        handMoveRef.current(smoothedCenterRef.current);
        onStatus(result.handPresent ? 'Hand Detected' : 'No Hand Detected');
        const events = stabilizerRef.current.update({ name: result.name, confidence: result.confidence, timestamp: result.timestamp, handPresent: result.handPresent });
        events.forEach((stable) => {
          if (stable.type === 'confirmed') {
            const command = gestureToInteraction(stable.gesture);
            if (command) {
              dispatchRef.current(command);
              if (stable.gesture !== 'None') onGestureConfirmed?.(gestureCommandLabels[stable.gesture]);
            }
          }
        });
      };
      setState('ready');
      onStatus('No Hand Detected');
      void refreshDevices();
      const loop = async (now: number) => {
        animationRef.current = requestAnimationFrame(loop);
        if (now - lastFrameRef.current < 33 || busyRef.current || video.readyState < 2) return;
        lastFrameRef.current = now;
        busyRef.current = true;
        try {
          const frame = await createImageBitmap(video);
          worker.postMessage({ type: 'frame', frame, timestamp: now }, [frame]);
        } catch {
          busyRef.current = false;
        }
      };
      animationRef.current = requestAnimationFrame(loop);
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      const next = name === 'NotAllowedError' ? 'denied' : name === 'NotFoundError' ? 'missing' : 'error';
      setErrorMessage(error instanceof Error ? error.message : 'Camera unavailable');
      setState(next);
      onStatus(next === 'denied' ? 'Permission Required' : next === 'missing' ? 'No Camera' : 'Camera Error');
    }
  }, [onGestureConfirmed, onInferenceMs, onStatus, refreshDevices, releaseCapture, selectedDeviceId]);

  useEffect(() => () => stop(), [stop]);
  useEffect(() => {
    queueMicrotask(() => void refreshDevices());
    navigator.mediaDevices?.addEventListener?.('devicechange', refreshDevices);
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', refreshDevices);
  }, [refreshDevices]);

  return (
    <aside className="camera-panel" aria-label="Webcam preview" hidden={hidden}>
      <div className="camera-frame">
        <video ref={videoRef} muted playsInline className={previewVisible ? '' : 'preview-hidden'} />
        {state !== 'ready' && <div className="camera-placeholder">{state === 'off' ? 'Camera Off' : state === 'starting' ? 'Starting Camera…' : state === 'denied' ? 'Camera permission is required' : state === 'missing' ? 'No camera detected' : errorMessage || 'Camera unavailable'}</div>}
      </div>
      <div className="camera-meta">
        <strong>{handPresent ? 'Hand Detected' : state === 'ready' ? 'No Hand Detected' : 'Gesture Controls'}</strong>
        <span>{handPresent ? gesture === 'None' ? 'Show a gesture clearly' : `Hold ${gestureLabels[gesture]} · ${Math.round(confidence * 100)}%` : gestureLabels[gesture]}</span>
      </div>
      <div className="camera-actions">
        {state === 'off' || state === 'denied' || state === 'missing' || state === 'error' ? <button type="button" onClick={() => void start()}>Turn On</button> : <button type="button" onClick={stop}>Turn Off</button>}
        {state === 'ready' && <button type="button" onClick={() => setPreviewVisible((value) => !value)}>{previewVisible ? 'Hide Preview' : 'Show Preview'}</button>}
      </div>
      {devices.length > 0 && <label className="camera-device">Camera<select aria-label="Camera device" value={selectedDeviceId} onChange={(event) => { const deviceId = event.target.value; setSelectedDeviceId(deviceId); if (state === 'ready') void start(deviceId); }}>{devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}</select></label>}
      {state === 'denied' && <button className="camera-settings" type="button" onClick={() => void window.desktop.openCameraSettings()}>Open Camera Settings</button>}
    </aside>
  );
}
