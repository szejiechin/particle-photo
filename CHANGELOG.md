# Changelog

## Unreleased fixes

- Removed Camera, Webcam Preview, Gesture Guide and gesture controls from the product interface and release bundle.
- Reduced the animation strip to Gather, Auto Rotate, Wave and Burst.
- Changed Auto Rotate from continuous 360-degree rotation to a slow, bounded
  vertical and horizontal tilt.
- Replaced the pebble-like particle material with small emissive cores and soft color-preserving glow halos.
- Added five sparse depth bridge layers behind the subject so rotation no longer exposes a large empty cavity before the background.

## 0.1.0 — Prototype RC

- Added local JPG/PNG input, drag and drop, cancellable depth analysis and 3D particle generation.
- Added Gather, Scatter, Rotate, Wave, Pause/Resume, mouse navigation and six particle controls.
- Added offline MediaPipe gesture recognition, camera selection, preview controls, permission recovery and hand-loss handling.
- Added fullscreen presentation controls, English-only UI audit, performance warnings and an opt-in `--debug-hud`.
- Added unit, Electron E2E, 20-image acceptance, five-minute stability, repeated-analysis memory and security tests.
- Added Windows Squirrel installer and portable ZIP packaging.
