# ADR 002 — Depth Runtime and Model

## Decision

Use the Apache-2.0 `onnx-community/depth-anything-v2-small-ONNX` Q4 model through
Transformers.js. Use WebGPU first in the Renderer Worker and WASM as fallback.
Package all model files locally and disable remote model loading.

## Evidence

- Node CPU spike: approximately 4.1 seconds initial load and 1.5 seconds first
  inference on a 640×480 sample before warm-cache optimization.
- Offline packaged Electron E2E completes image-to-workspace in 3.6 seconds.
- Batch acceptance: 20/20 deterministic fixtures produce valid non-flat depth
  maps. Detailed results are in `docs/acceptance-image-results.json`.

## Consequence

The installer includes approximately 28 MB of depth model files. Checksums are
verified by `npm run verify:models`.
