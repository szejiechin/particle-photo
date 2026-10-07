export interface ParticleBuffers {
  count: number;
  basePosition: Float32Array;
  color: Float32Array;
  scatterDirection: Float32Array;
  randomSeed: Float32Array;
  subjectWeight: Float32Array;
  radialDistance: Float32Array;
}

export interface ParticleBuildOptions {
  maxParticles: number;
  depthScale: number;
  backgroundStrength: number;
  seed: number;
}
