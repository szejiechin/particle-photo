export const particlePerspectiveScale = 5.5;

export function particleSizeUniform(setting: number): number {
  return 1.8 + Math.max(0, Math.min(1, setting)) * 4.2;
}

export function projectedParticleDiameter(setting: number, cameraDistance: number): number {
  return particleSizeUniform(setting) * particlePerspectiveScale / Math.max(0.5, cameraDistance);
}
