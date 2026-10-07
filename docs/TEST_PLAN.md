# Prototype Test Plan

## Automated checks

1. `npm run lint`
2. `npm run typecheck`
3. `npm test`
4. `npm run audit:ui`
5. `npm run verify:models`
6. `npm run test:acceptance:images`
7. `npm run package`
8. `npm run test:e2e`
9. `npm run make`
10. `npm run audit:security`
11. `npm run test:stability` (5-minute scene + 20-scene replacement/memory run)

## Manual visual checks

- Confirm the animation strip contains only Gather, Auto Rotate, Wave and Burst.
- Confirm Auto Rotate slowly tilts up/down and left/right without completing a
  360-degree turn.
- Confirm Wave and Burst visibly complete and can be triggered repeatedly.
- Confirm the interface never requests camera permission and contains no Camera,
  Webcam Preview or Gesture Guide control.
- Inspect the 20 image scenes from front and side with five independent testers
  for PRD B-02 and B-03.

Manual results must not be replaced with simulated results.
