import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { TopToolbar } from './components/TopToolbar';
import { copy } from './copy/en';
import { deriveSubjectWeights } from './features/analysis/depth';
import { DepthClient, type DepthJob } from './features/analysis/depthClient';
import type { AnalysisResult } from './features/analysis/types';
import { ControlsPanel } from './features/controls/ControlsPanel';
import { defaultSettings, particleBudget, type ParticleSettings } from './features/controls/settings';
import { ParticleCanvas } from './features/particles/ParticleCanvas';
import { buildParticleBuffers } from './features/particles/sampler';
import type { ParticleBuffers } from './features/particles/types';
import { decodeImage, detectImageMime } from './features/upload/decodeImage';
import { ProcessingScreen } from './screens/ProcessingScreen';
import { initialInteractionState, interactionReducer, type InteractionEvent } from './state/interactionState';
import { AppError, messageForError } from './errors';
import './styles/app.css';

type Screen = 'empty' | 'processing' | 'workspace' | 'error';

interface SourceImage {
  name: string;
  bytes: Uint8Array;
  mimeType: string;
}

const stageLabels: Record<string, string> = {
  decoding: 'Loading Image',
  'loading-model': 'Detecting Subject',
  'estimating-depth': 'Estimating Depth',
  particles: 'Generating Particles',
};

export function App() {
  const [screen, setScreen] = useState<Screen>('empty');
  const [stage, setStage] = useState('decoding');
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [settings, setSettings] = useState<ParticleSettings>(defaultSettings);
  const [analysis, setAnalysis] = useState<AnalysisResult>();
  const [hasSource, setHasSource] = useState(false);
  const [particles, setParticles] = useState<ParticleBuffers>();
  const [interaction, dispatch] = useReducer(interactionReducer, initialInteractionState);
  const [fullscreen, setFullscreen] = useState(false);
  const [replaceConfirmationVisible, setReplaceConfirmationVisible] = useState(false);
  const [pendingReplacementSource, setPendingReplacementSource] = useState<SourceImage>();
  const [fullscreenUiVisible, setFullscreenUiVisible] = useState(true);
  const [performanceWarning, setPerformanceWarning] = useState(false);
  const [renderFps, setRenderFps] = useState(0);
  const debugHud = useMemo(() => new URLSearchParams(window.location.search).get('debug') === '1', []);
  const depthClient = useMemo(() => new DepthClient(), []);
  const jobRef = useRef<DepthJob | undefined>(undefined);
  const sourceRef = useRef<SourceImage | undefined>(undefined);
  const previewUrlRef = useRef<string | undefined>(undefined);
  const fullscreenUiTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const generateParticles = useCallback((result: AnalysisResult, current: ParticleSettings) => {
    setParticles(buildParticleBuffers(result.image, result.depth, result.subjectWeights, {
      maxParticles: particleBudget(current.density),
      depthScale: 1,
      backgroundStrength: 0.35,
      seed: 0x50484f54,
    }));
  }, []);

  const analyze = useCallback(async (source: SourceImage) => {
    jobRef.current?.cancel();
    setError('');
    setScreen('processing');
    setStage('decoding');
    sourceRef.current = source;
    setHasSource(true);
    try {
      const decoded = await decodeImage(source.bytes, source.mimeType);
      setPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        previewUrlRef.current = decoded.previewUrl;
        return decoded.previewUrl;
      });
      const job = depthClient.analyze(source.bytes.slice().buffer, decoded.mimeType, setStage);
      jobRef.current = job;
      const depthResult = await job.promise;
      setStage('particles');
      const result: AnalysisResult = {
        image: decoded.image,
        depth: depthResult.depth,
        subjectWeights: deriveSubjectWeights(depthResult.depth),
        durationMs: depthResult.durationMs,
      };
      setAnalysis(result);
      generateParticles(result, settings);
      setScreen('workspace');
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setError(messageForError(reason, copy.generationFailed));
      setScreen(analysis && particles ? 'workspace' : 'error');
    }
  }, [analysis, depthClient, generateParticles, particles, settings]);

  const openImage = useCallback(async () => {
    const selected = await window.desktop.openImageFile();
    if (!selected) return;
    const bytes = selected.bytes instanceof Uint8Array ? selected.bytes : new Uint8Array(selected.bytes);
    const mimeType = detectImageMime(bytes);
    if (!mimeType) {
      setError(messageForError(new AppError('UNSUPPORTED_IMAGE'), copy.invalidImage));
      setScreen('error');
      return;
    }
    await analyze({ name: selected.name, bytes, mimeType });
  }, [analyze]);

  const requestOpenImage = useCallback(() => {
    if (screen === 'workspace') {
      setPendingReplacementSource(undefined);
      setReplaceConfirmationVisible(true);
    }
    else void openImage();
  }, [openImage, screen]);

  const acceptBrowserFile = useCallback(async (file: File) => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mimeType = detectImageMime(bytes);
    if (!mimeType) {
      setError(messageForError(new AppError('UNSUPPORTED_IMAGE'), copy.invalidImage));
      setScreen('error');
      return;
    }
    const source = { name: file.name, bytes, mimeType };
    if (screen === 'workspace') {
      setPendingReplacementSource(source);
      setReplaceConfirmationVisible(true);
      return;
    }
    await analyze(source);
  }, [analyze, screen]);

  const updateSettings = useCallback((next: ParticleSettings) => {
    const densityChanged = next.density !== settings.density;
    setSettings(next);
    if (densityChanged && analysis) generateParticles(analysis, next);
  }, [analysis, generateParticles, settings.density]);

  const toggleFullscreen = useCallback(async () => {
    const enabled = await window.desktop.setFullscreen(!fullscreen);
    setFullscreen(enabled);
    setFullscreenUiVisible(true);
  }, [fullscreen]);

  const showFullscreenUi = useCallback(() => {
    if (!fullscreen) return;
    setFullscreenUiVisible(true);
    clearTimeout(fullscreenUiTimerRef.current);
    fullscreenUiTimerRef.current = setTimeout(() => setFullscreenUiVisible(false), 2_500);
  }, [fullscreen]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, button')) return;
      if (event.key.toLowerCase() === 'f') {
        void toggleFullscreen();
      } else if (event.key === 'Escape') {
        if (fullscreen) void toggleFullscreen();
        else if (interaction.mode === 'rotate') dispatch({ type: 'ESC_PRESSED' });
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [fullscreen, interaction.mode, toggleFullscreen]);

  useEffect(() => () => {
    jobRef.current?.cancel();
    depthClient.dispose();
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    clearTimeout(fullscreenUiTimerRef.current);
  }, [depthClient]);

  const runCommand = (event: InteractionEvent) => dispatch(event);

  if (screen === 'processing') {
    return <ProcessingScreen stage={stageLabels[stage] ?? stage} previewUrl={previewUrl} onCancel={() => { jobRef.current?.cancel(); setScreen(particles ? 'workspace' : 'empty'); }} />;
  }

  if (screen === 'error') {
    return (
      <main className="app-shell error-state">
        <h1>{copy.generationFailed}</h1>
        <p role="alert">{error}</p>
        <div className="error-actions">
          {hasSource && <button type="button" onClick={() => sourceRef.current && void analyze(sourceRef.current)}>Try Again</button>}
          <button type="button" onClick={requestOpenImage}>Choose Another Photo</button>
        </div>
      </main>
    );
  }

  if (screen === 'workspace' && particles) {
    return (
      <main className={`app-shell workspace ${fullscreen ? 'is-fullscreen' : ''} ${fullscreenUiVisible ? 'fullscreen-ui-visible' : ''}`} onMouseMove={showFullscreenUi} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) void acceptBrowserFile(file); }}>
        {!fullscreen && <TopToolbar onUpload={requestOpenImage} onReanalyze={() => sourceRef.current && void analyze(sourceRef.current)} onFullscreen={() => void toggleFullscreen()} />}
        <ParticleCanvas buffers={particles} settings={settings} interaction={interaction} dispatch={dispatch} onPerformanceWarning={() => setPerformanceWarning(true)} onRenderFps={debugHud ? setRenderFps : undefined} />
        {!fullscreen && <ControlsPanel settings={settings} onChange={updateSettings} />}
        {fullscreen && <div className="fullscreen-tools" aria-hidden={!fullscreenUiVisible}>
          <button type="button" onClick={() => void toggleFullscreen()}>Exit Fullscreen</button>
        </div>}
        <div className="command-strip" aria-label="Interaction controls">
          <button type="button" onClick={() => runCommand({ type: 'GATHER_REQUESTED' })}>Gather</button>
          <button type="button" className={interaction.mode === 'rotate' ? 'is-active' : ''} onClick={() => runCommand({ type: 'ROTATE_TOGGLED' })}>Auto Rotate</button>
          <button type="button" onClick={() => runCommand({ type: 'WAVE_REQUESTED' })}>Wave</button>
          <button type="button" onClick={() => runCommand({ type: 'BURST_REQUESTED' })}>Burst</button>
        </div>
        <div className="mode-status" role="status">{interaction.mode === 'rotate' ? 'Auto Rotate' : `${particles.count.toLocaleString()} particles`}</div>
        {error && <div className="error-toast" role="alert">{error}</div>}
        {performanceWarning && <div className="performance-warning" role="alert">Performance is below 30 FPS. Try lowering Particle Density.</div>}
        {debugHud && <output className="performance-hud" aria-label="Performance metrics">Render {renderFps.toFixed(0)} FPS · {particles.count.toLocaleString()} particles · Depth {analysis?.durationMs.toFixed(0) ?? '—'} ms</output>}
        {replaceConfirmationVisible && <div className="modal-backdrop"><section className="replace-dialog" role="dialog" aria-modal="true" aria-labelledby="replace-title"><h2 id="replace-title">Replace current photo?</h2><p>Your current particle scene will be replaced.</p><div><button type="button" onClick={() => { setPendingReplacementSource(undefined); setReplaceConfirmationVisible(false); }}>Cancel</button><button type="button" onClick={() => { const source = pendingReplacementSource; setPendingReplacementSource(undefined); setReplaceConfirmationVisible(false); if (source) void analyze(source); else void openImage(); }}>{pendingReplacementSource ? 'Replace Photo' : 'Choose Photo'}</button></div></section></div>}
      </main>
    );
  }

  return (
    <main className="app-shell" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) void acceptBrowserFile(file); }}>
      <header className="topbar"><span className="brand">{copy.productName}</span></header>
      <section className="empty-state" aria-labelledby="hero-title">
        <p className="eyebrow">CREATE WITH DEPTH</p>
        <h1 id="hero-title">{copy.heroTitle}</h1>
        <p>{copy.heroBody}</p>
        <button type="button" onClick={() => void openImage()}>{copy.uploadPhoto}</button>
        <small>{copy.dropHint}</small>
      </section>
    </main>
  );
}
