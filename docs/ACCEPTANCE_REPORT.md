# Prototype Acceptance Report

## Automated status

| Area | Status | Evidence |
|---|---|---|
| Static quality | PASS | ESLint, strict TypeScript, and 7-check Electron security audit |
| Unit tests | PASS | 16 Vitest files, 35 tests |
| Model integrity | PASS | Three pinned SHA-256 checksums |
| English UI | PASS | Automated CJK audit of Renderer TSX/HTML |
| 20-image depth generation | PASS | 20/20 non-flat depth maps |
| Offline image-to-particle flow | PASS | Playwright Electron E2E |
| Fullscreen round trip | PASS | Playwright Electron E2E |
| Focused animation controls | PASS | Gather, bounded Auto Rotate, Wave and Burst Electron E2E |
| Five-minute stability | PASS | 5.1 minutes; first 2 minutes continuously interactive |
| Repeated analysis stability | PASS | 20 different scenes replaced; bounded process-memory growth |
| Windows package | PASS | Electron Forge package |
| Windows installer | PASS | Electron Forge Squirrel and ZIP artifacts |

## Final automated run

- ESLint: pass.
- TypeScript strict check: pass.
- Vitest: 16 files, 35 tests passed.
- Electron Playwright: 3 tests passed.
- English UI audit: pass.
- Model SHA-256 verification: 3/3 pass.
- Batch depth generation: 20/20 pass.
- Production dependency audit: 0 known vulnerabilities.
- Full dependency audit: 0 known vulnerabilities.
- WebGL renderer: NVIDIA RTX 4050 through ANGLE D3D11.
- Empty-window presentation baseline: 56.6 FPS.
- Default particle-scene presentation: 60.2 FPS on the Reference PC.
- Final four-animation particle scene presentation: 60.3 FPS.
- GPU-completed particle render throughput: 5,263.2 FPS in the final E2E sample.
- Final `app.asar`: no CameraPanel, gesture Worker, MediaPipe runtime or gesture
  recognizer model entries.
- Five-minute Release stability test: pass; more than 100 throughput samples,
  average at or above the 30 FPS Gate, no crash or lost canvas.
- Twenty-scene replacement/memory test: pass in 29.2 seconds with no unbounded
  process-memory growth.

## Animation and 3D-particle verification

- Camera, Webcam Preview, Gesture Guide and gesture input are absent from the
  current product interface.
- The animation strip contains exactly Gather, Auto Rotate, Wave and Burst.
- Auto Rotate oscillates vertically within ±0.06 radians and horizontally within
  ±0.12 radians of its starting view, so it cannot accumulate a 360° rotation.
- Wave and Burst can be triggered repeatedly; Gather remains available as the
  return-to-photo command.
- Particle material: compact emissive core with a soft, color-preserving glow halo.
- Subject volume: five evenly spaced sparse bridge layers from the visible subject
  surface toward recessed background depth, using edge-background color blending.
- Default candidate budget: 80,000; the captured scene used all 80,000 particles.
- Visual evidence: `docs/evidence/glowing-particles-front.png` and
  `docs/evidence/glowing-particles-side.png`.

## Release artifacts

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| `ParticlePhoto-0.1.0 Setup.exe` | 187,066,368 | `1E28FE60E14C0072A7E40EE4F1EA93686C8D34B4D39CFCAF466630FD07FC009D` |
| `ParticlePhoto-win32-x64-0.1.0.zip` | 192,033,872 | `4E1CAD66772D5D2E4C278AB021B054D5CBB2B6896796FB354C2DA93DC8794918` |

The installer is not code-signed and may show a Windows SmartScreen warning.

## Manual status

The following PRD criteria cannot be truthfully automated. They remain pending
until a physical/manual acceptance session is performed:

- B-02 front-view recognizability by five testers.
- B-03 perceived subject/background separation by five testers.
- REL-002 installation, offline launch and uninstall on an independent clean
  Windows machine without Node.js.

No automated or synthetic result may be recorded as a pass for these items.
