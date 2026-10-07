import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { ParticleSettings } from '../controls/settings';
import type { InteractionEvent, InteractionState } from '../../state/interactionState';
import type { ParticleBuffers } from './types';
import { PerformanceGuard } from './performanceGuard';
import { particlePerspectiveScale, particleSizeUniform } from './appearance';

interface ParticleCanvasProps {
  buffers: ParticleBuffers;
  settings: ParticleSettings;
  interaction: InteractionState;
  dispatch(event: InteractionEvent): void;
  onPerformanceWarning?(): void;
  onRenderFps?(fps: number): void;
}

const vertexShader = `
attribute vec3 scatterDirection;
attribute float randomSeed;
attribute float subjectWeight;
attribute float radialDistance;
uniform float uTime;
uniform float uScatter;
uniform float uPointSize;
uniform float uDepthStrength;
uniform float uBackgroundStrength;
uniform float uFloatingStrength;
uniform float uWaveAge;
uniform float uBurstAge;
varying vec3 vColor;
varying float vAlpha;
varying float vSeed;

void main() {
  vec3 p = position;
  p.z *= uDepthStrength;
  float floatScale = uFloatingStrength;
  float drift = sin(uTime * (0.55 + randomSeed) + randomSeed * 31.4) * 0.018 * floatScale;
  p += vec3(drift * (0.4 + randomSeed), drift, drift * 0.6);
  if (uBurstAge >= 0.0 && uBurstAge <= 1.0) {
    p += scatterDirection * sin(uBurstAge * 3.14159265) * 0.52;
  }
  float easedScatter = uScatter * uScatter * (3.0 - 2.0 * uScatter);
  p += scatterDirection * easedScatter;
  if (uWaveAge >= 0.0 && uWaveAge <= 1.0) {
    float front = uWaveAge * 1.75;
    float pulse = exp(-pow((radialDistance - front) * 13.0, 2.0));
    p.z += pulse * 0.26;
    p.xy *= 1.0 + pulse * 0.035;
  }
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = uPointSize * (0.86 + randomSeed * 0.24) * (${particlePerspectiveScale.toFixed(1)} / max(0.5, -mvPosition.z));
  vColor = color;
  vAlpha = mix(max(0.08, uBackgroundStrength), 1.0, subjectWeight);
  vSeed = randomSeed;
}
`;

const fragmentShader = `
varying vec3 vColor;
varying float vAlpha;
varying float vSeed;
void main() {
  vec2 center = gl_PointCoord * 2.0 - 1.0;
  float radius = length(center);
  if (radius > 1.0) discard;

  float core = 1.0 - smoothstep(0.06, 0.32, radius);
  float body = 1.0 - smoothstep(0.16, 0.58, radius);
  float halo = (1.0 - smoothstep(0.28, 1.0, radius)) * (0.82 + vSeed * 0.18);
  float alpha = vAlpha * min(1.0, body * 0.82 + halo * 0.42);
  if (alpha < 0.025) discard;
  vec3 luminousColor = vColor * (1.05 + core * 1.25 + halo * 0.28) + vec3(core * 0.38);
  gl_FragColor = vec4(luminousColor, alpha);
}
`;

export function ParticleCanvas({ buffers, settings, interaction, dispatch, onPerformanceWarning, onRenderFps }: ParticleCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const dispatchRef = useRef(dispatch);
  const stateRef = useRef(interaction);
  const settingsRef = useRef(settings);
  const performanceWarningRef = useRef(onPerformanceWarning);
  const renderFpsRef = useRef(onRenderFps);
  const scatterRef = useRef(interaction.photo === 'scattered' ? 1 : 0);
  const waveProgressRef = useRef(-1);
  const waveIdRef = useRef(interaction.waveId);
  const burstProgressRef = useRef(-1);
  const burstIdRef = useRef(interaction.burstId);

  useEffect(() => { dispatchRef.current = dispatch; }, [dispatch]);
  useEffect(() => {
    if (stateRef.current.photo !== interaction.photo && (interaction.photo === 'gathering' || interaction.photo === 'scattering')) {
      waveProgressRef.current = -1;
    }
    if (waveIdRef.current !== interaction.waveId) {
      waveIdRef.current = interaction.waveId;
      waveProgressRef.current = 0;
    }
    if (burstIdRef.current !== interaction.burstId) {
      burstIdRef.current = interaction.burstId;
      burstProgressRef.current = 0;
    }
    stateRef.current = interaction;
  }, [interaction]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { performanceWarningRef.current = onPerformanceWarning; }, [onPerformanceWarning]);
  useEffect(() => { renderFpsRef.current = onRenderFps; }, [onRenderFps]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 100);
    camera.position.z = 3.2;
    const group = new THREE.Group();
    scene.add(group);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(buffers.basePosition, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(buffers.color, 3));
    geometry.setAttribute('scatterDirection', new THREE.BufferAttribute(buffers.scatterDirection, 3));
    geometry.setAttribute('randomSeed', new THREE.BufferAttribute(buffers.randomSeed, 1));
    geometry.setAttribute('subjectWeight', new THREE.BufferAttribute(buffers.subjectWeight, 1));
    geometry.setAttribute('radialDistance', new THREE.BufferAttribute(buffers.radialDistance, 1));
    geometry.computeBoundingSphere();
    const uniforms = {
      uTime: { value: 0 },
      uScatter: { value: scatterRef.current },
      uPointSize: { value: 3 },
      uDepthStrength: { value: 1 },
      uBackgroundStrength: { value: settingsRef.current.backgroundStrength },
      uFloatingStrength: { value: settingsRef.current.floatingStrength },
      uWaveAge: { value: -1 },
      uBurstAge: { value: -1 },
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      vertexColors: true,
      transparent: true,
      depthWrite: true,
      depthTest: true,
      blending: THREE.NormalBlending,
    });
    const points = new THREE.Points(geometry, material);
    group.add(points);

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const pointerDown = (event: PointerEvent) => {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const pointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      group.rotation.y += (event.clientX - lastX) * 0.006;
      group.rotation.x = THREE.MathUtils.clamp(group.rotation.x + (event.clientY - lastY) * 0.004, -0.65, 0.65);
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const pointerUp = () => { dragging = false; };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      camera.position.z = THREE.MathUtils.clamp(camera.position.z + event.deltaY * 0.0025, 1.8, 6);
    };
    const resetView = () => {
      group.rotation.set(0, 0, 0);
      camera.position.z = 3.2;
    };
    renderer.domElement.addEventListener('pointerdown', pointerDown);
    renderer.domElement.addEventListener('pointermove', pointerMove);
    renderer.domElement.addEventListener('pointerup', pointerUp);
    renderer.domElement.addEventListener('pointercancel', pointerUp);
    renderer.domElement.addEventListener('wheel', wheel, { passive: false });
    renderer.domElement.addEventListener('dblclick', resetView);

    let frame = 0;
    let measuredFrames = 0;
    let measuredRenderMs = 0;
    let animationTime = 0;
    let autoTiltElapsed = 0;
    let autoTiltActive = false;
    let autoTiltCenterX = 0;
    let autoTiltCenterY = 0;
    let previous = performance.now();
    const performanceGuard = new PerformanceGuard();
    const render = (now: number) => {
      frame = requestAnimationFrame(render);
      const delta = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      const current = stateRef.current;
      const currentSettings = settingsRef.current;
      const speed = 0.35 + currentSettings.animationSpeed * 1.65;
      if (current.photo === 'scattering') {
        scatterRef.current = Math.min(1, scatterRef.current + delta * speed);
        if (scatterRef.current >= 1) dispatchRef.current({ type: 'ANIMATION_COMPLETED' });
      } else if (current.photo === 'gathering') {
        scatterRef.current = Math.max(0, scatterRef.current - delta * speed);
        if (scatterRef.current <= 0) dispatchRef.current({ type: 'ANIMATION_COMPLETED' });
      }
      animationTime += delta;
      uniforms.uTime.value = animationTime;
      uniforms.uScatter.value = scatterRef.current;
      uniforms.uPointSize.value = particleSizeUniform(currentSettings.particleSize);
      uniforms.uDepthStrength.value = 0.2 + currentSettings.depthStrength * 1.3;
      uniforms.uBackgroundStrength.value = currentSettings.backgroundStrength;
      uniforms.uFloatingStrength.value = currentSettings.floatingStrength;
      if (waveProgressRef.current >= 0 && waveProgressRef.current <= 1) {
        waveProgressRef.current += delta / (0.7 + (1 - currentSettings.animationSpeed) * 0.8);
      }
      uniforms.uWaveAge.value = waveProgressRef.current;
      if (burstProgressRef.current >= 0 && burstProgressRef.current <= 1) {
        burstProgressRef.current += delta / (0.85 + (1 - currentSettings.animationSpeed) * 0.75);
      }
      uniforms.uBurstAge.value = burstProgressRef.current;
      if (current.mode === 'rotate') {
        if (!autoTiltActive) {
          autoTiltActive = true;
          autoTiltElapsed = 0;
          autoTiltCenterX = group.rotation.x;
          autoTiltCenterY = group.rotation.y;
        }
        autoTiltElapsed += delta * (0.65 + currentSettings.animationSpeed * 0.5);
        group.rotation.x = autoTiltCenterX + Math.sin(autoTiltElapsed * 0.72) * 0.06;
        group.rotation.y = autoTiltCenterY + Math.sin(autoTiltElapsed * 0.48) * 0.12;
      } else {
        autoTiltActive = false;
      }
      host.dataset.rotationX = String(group.rotation.x);
      host.dataset.rotationY = String(group.rotation.y);
      const renderStarted = performance.now();
      renderer.render(scene, camera);
      if (window.__particleBenchmark === true && measuredFrames === 9) renderer.getContext().finish();
      measuredRenderMs += performance.now() - renderStarted;
      measuredFrames += 1;
      if (measuredFrames >= 10) {
        const renderFps = 1000 / Math.max(0.001, measuredRenderMs / measuredFrames);
        host.dataset.renderFps = String(renderFps);
        renderFpsRef.current?.(renderFps);
        if (performanceGuard.update(renderFps)) performanceWarningRef.current?.();
        measuredFrames = 0;
        measuredRenderMs = 0;
      }
    };
    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', pointerDown);
      renderer.domElement.removeEventListener('pointermove', pointerMove);
      renderer.domElement.removeEventListener('pointerup', pointerUp);
      renderer.domElement.removeEventListener('pointercancel', pointerUp);
      renderer.domElement.removeEventListener('wheel', wheel);
      renderer.domElement.removeEventListener('dblclick', resetView);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [buffers]);

  return <div ref={hostRef} className="particle-canvas" aria-label="3D particle canvas" />;
}
