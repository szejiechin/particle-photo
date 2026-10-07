# ADR 001 — Desktop Stack

## Decision

Use Electron Forge, React, TypeScript, Vite and Three.js.

## Reason

The stack provides one Windows desktop codebase with Worker, WebGL and WebGPU
capabilities. The current product does not request camera access. Electron is configured with sandboxing,
`nodeIntegration: false` and `contextIsolation: true`. A narrow validated IPC
surface is exposed through preload.

## Evidence

- Electron package builds successfully.
- Playwright launches the packaged app.
- Offline upload-to-particle E2E passes.
