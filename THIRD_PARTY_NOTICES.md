# Third-Party Notices

This Prototype includes open-source software and model assets. The release owner
must preserve the full license texts supplied by the corresponding packages.

| Component | Purpose | License/source |
|---|---|---|
| Electron 44.5.1 | Desktop runtime | MIT — https://github.com/electron/electron |
| React 19.3.0 | UI | MIT — https://github.com/facebook/react |
| Three.js 0.186.1 | 3D rendering | MIT — https://github.com/mrdoob/three.js |
| Transformers.js 4.3.0 | Local depth inference | Apache-2.0 — https://github.com/huggingface/transformers.js |
| Depth Anything V2 Small ONNX | Relative depth model | Apache-2.0 — https://huggingface.co/onnx-community/depth-anything-v2-small-ONNX |

The 20 Picsum images under `tests/fixtures/acceptance` are test-only and are not
included in the packaged application through the Vite renderer asset pipeline.
Packaged depth-model assets are pinned by SHA-256 and verified by
`npm run verify:models`. Legacy camera assets remain only in the local source
workspace for recoverability and are excluded from release builds. Public commercial distribution should repeat legal
review against the exact pinned model-card terms.
