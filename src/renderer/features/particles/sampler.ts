import { sampleDepthBilinear } from '../analysis/depth';
import type { DepthMap, PixelImage } from '../analysis/types';
import type { ParticleBuffers, ParticleBuildOptions } from './types';

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function subjectAt(weights: Float32Array, depth: DepthMap, u: number, v: number): number {
  const x = Math.round(Math.max(0, Math.min(1, u)) * (depth.width - 1));
  const y = Math.round(Math.max(0, Math.min(1, v)) * (depth.height - 1));
  return weights[y * depth.width + x] ?? 0;
}

function backgroundDepth(depth: DepthMap): number {
  const histogram = new Uint32Array(64);
  for (const value of depth.values) histogram[Math.min(63, Math.max(0, Math.floor(value * 63)))] += 1;
  const target = depth.values.length * 0.28;
  let seen = 0;
  for (let index = 0; index < histogram.length; index += 1) {
    seen += histogram[index];
    if (seen >= target) return index / 63;
  }
  return 0.25;
}

interface ParticleCandidate {
  pixelIndex: number;
  colorPixelIndex: number;
  layerT: number;
}

export function buildParticleBuffers(
  image: PixelImage,
  depth: DepthMap,
  weights: Float32Array,
  options: ParticleBuildOptions,
): ParticleBuffers {
  if (image.width <= 0 || image.height <= 0 || image.rgba.length !== image.width * image.height * 4) {
    throw new RangeError('Invalid image data');
  }
  if (weights.length !== depth.width * depth.height) throw new RangeError('Invalid subject weights');
  if (options.maxParticles <= 0) throw new RangeError('maxParticles must be positive');

  const random = mulberry32(options.seed);
  const pixelCount = image.width * image.height;
  const stride = Math.max(1, Math.sqrt(pixelCount / options.maxParticles));
  const candidates: number[] = [];

  for (let y = stride / 2; y < image.height; y += stride) {
    for (let x = stride / 2; x < image.width; x += stride) {
      const px = Math.min(image.width - 1, Math.floor(x));
      const py = Math.min(image.height - 1, Math.floor(y));
      const alpha = image.rgba[(py * image.width + px) * 4 + 3] / 255;
      if (alpha <= 0.02) continue;
      const u = px / Math.max(1, image.width - 1);
      const v = py / Math.max(1, image.height - 1);
      const subject = subjectAt(weights, depth, u, v);
      const keepChance = subject + (1 - subject) * Math.max(0.05, options.backgroundStrength);
      if (random() <= keepChance) candidates.push(py * image.width + px);
    }
  }

  if (candidates.length > options.maxParticles) candidates.length = options.maxParticles;
  const volumeLayers: ParticleCandidate[] = [];
  const farDepth = backgroundDepth(depth);
  const layerSteps = [0.2, 0.4, 0.6, 0.8, 1];
  const eligible = candidates.filter((pixelIndex) => {
    const px = pixelIndex % image.width;
    const py = Math.floor(pixelIndex / image.width);
    return subjectAt(weights, depth, px / Math.max(1, image.width - 1), py / Math.max(1, image.height - 1)) >= 0.34;
  });
  const columnBudget = Math.max(0, Math.floor((options.maxParticles - candidates.length) / layerSteps.length));
  const selectedColumns = columnBudget >= eligible.length
    ? eligible
    : Array.from({ length: columnBudget }, (_, index) => eligible[Math.floor(index * eligible.length / columnBudget)]);
  for (const layerT of layerSteps) {
    for (const pixelIndex of selectedColumns) {
      const px = pixelIndex % image.width;
      const py = Math.floor(pixelIndex / image.width);
      const u = px / Math.max(1, image.width - 1);
      const v = py / Math.max(1, image.height - 1);
      const horizontal = Math.abs(u - 0.5) >= Math.abs(v - 0.5);
      const colorX = horizontal ? (u < 0.5 ? Math.floor(image.width * 0.06) : Math.floor(image.width * 0.94)) : px;
      const colorY = horizontal ? py : (v < 0.5 ? Math.floor(image.height * 0.06) : Math.floor(image.height * 0.94));
      volumeLayers.push({
        pixelIndex,
        colorPixelIndex: Math.min(image.width - 1, colorX) + Math.min(image.height - 1, colorY) * image.width,
        layerT,
      });
    }
  }
  const particles: ParticleCandidate[] = [
    ...volumeLayers,
    ...candidates.slice(0, options.maxParticles - volumeLayers.length).map((pixelIndex) => ({ pixelIndex, colorPixelIndex: pixelIndex, layerT: 0 })),
  ];
  const count = particles.length;
  const basePosition = new Float32Array(count * 3);
  const color = new Float32Array(count * 3);
  const scatterDirection = new Float32Array(count * 3);
  const randomSeed = new Float32Array(count);
  const subjectWeight = new Float32Array(count);
  const radialDistance = new Float32Array(count);
  const aspect = image.width / image.height;

  particles.forEach(({ pixelIndex, colorPixelIndex, layerT }, i) => {
    const px = pixelIndex % image.width;
    const py = Math.floor(pixelIndex / image.width);
    const u = px / Math.max(1, image.width - 1);
    const v = py / Math.max(1, image.height - 1);
    const x = (u - 0.5) * 2 * aspect;
    const y = (0.5 - v) * 2;
    const sourceDepth = sampleDepthBilinear(depth, u, v);
    const targetDepth = Math.min(farDepth, sourceDepth - 0.1);
    const z = ((sourceDepth + (targetDepth - sourceDepth) * layerT) - 0.5) * options.depthScale;
    const output = i * 3;
    basePosition[output] = x;
    basePosition[output + 1] = y;
    basePosition[output + 2] = z;
    const rgba = colorPixelIndex * 4;
    const sourceRgba = pixelIndex * 4;
    const colorMix = layerT * 0.78;
    color[output] = (image.rgba[sourceRgba] * (1 - colorMix) + image.rgba[rgba] * colorMix) / 255;
    color[output + 1] = (image.rgba[sourceRgba + 1] * (1 - colorMix) + image.rgba[rgba + 1] * colorMix) / 255;
    color[output + 2] = (image.rgba[sourceRgba + 2] * (1 - colorMix) + image.rgba[rgba + 2] * colorMix) / 255;
    const angle = random() * Math.PI * 2;
    const distance = 0.5 + random() * 1.8;
    scatterDirection[output] = Math.cos(angle) * distance;
    scatterDirection[output + 1] = Math.sin(angle) * distance;
    scatterDirection[output + 2] = (random() - 0.5) * 1.8;
    randomSeed[i] = random();
    const subject = subjectAt(weights, depth, u, v);
    subjectWeight[i] = layerT > 0 ? Math.max(0.08, subject * (1 - layerT) * 0.34) : subject;
    radialDistance[i] = Math.hypot(x / Math.max(aspect, 0.001), y);
  });

  return { count, basePosition, color, scatterDirection, randomSeed, subjectWeight, radialDistance };
}
