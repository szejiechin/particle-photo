export interface ParticleSettings {
  density: number;
  particleSize: number;
  depthStrength: number;
  backgroundStrength: number;
  floatingStrength: number;
  animationSpeed: number;
}

export const defaultSettings: ParticleSettings = {
  density: 0.55,
  particleSize: 0.48,
  depthStrength: 0.58,
  backgroundStrength: 0.38,
  floatingStrength: 0.28,
  animationSpeed: 0.5,
};

export function particleBudget(density: number): number {
  return Math.round(25_000 + Math.max(0, Math.min(1, density)) * 100_000);
}

export function semanticValue(value: number): 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High' {
  if (value < 0.15) return 'Very Low';
  if (value < 0.4) return 'Low';
  if (value < 0.65) return 'Medium';
  if (value < 0.9) return 'High';
  return 'Very High';
}
