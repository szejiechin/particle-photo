# ADR 004 — Gesture Runtime

## Status

Superseded on 2026-10-07. Camera and gesture functionality is no longer part of
the product. The current release provides direct animation controls for Gather,
bounded Auto Rotate, Wave and Burst, and
does not package the MediaPipe model or WASM runtime.

## Historical decision

Use the MediaPipe Gesture Recognizer with its official local model and WASM
runtime in a dedicated Worker. Capture at most one frame every 50 ms and detect
one hand.

Mappings:

- Closed_Fist → Gather
- Open_Palm → Scatter
- Victory → Rotate Mode
- Pointing_Up → Wave
- Thumb_Up → Pause / Resume

Commands require a 350 ms stable hold, confidence ≥0.42, and a neutral release
before the same gesture can trigger again. Up to 160 ms of low-confidence frame
dropout is tolerated so ordinary camera noise does not continually reset a held
gesture. The recognizer accepts candidates at 0.25 before temporal filtering and
captures up to 30 FPS. Rotate uses mirrored, smoothed palm-center coordinates, a
dead zone and bounded pitch.

## Historical consequence

The release package includes the official gesture model and MediaPipe WASM.
Model integrity is checked by `npm run verify:models`.
