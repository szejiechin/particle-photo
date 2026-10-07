export type GestureName = 'None' | 'Closed_Fist' | 'Open_Palm' | 'Victory' | 'Pointing_Up' | 'Thumb_Up';

export interface GestureSample {
  name: GestureName;
  confidence: number;
  timestamp: number;
  handPresent: boolean;
}

export interface StableGestureEvent {
  type: 'candidate' | 'confirmed' | 'released' | 'hand-lost';
  gesture: GestureName;
}

export interface GestureStabilizerOptions {
  holdMs: number;
  releaseMs: number;
  confidenceThreshold: number;
  dropoutGraceMs?: number;
}

export const responsiveGestureOptions: GestureStabilizerOptions = {
  holdMs: 350,
  releaseMs: 160,
  confidenceThreshold: 0.42,
  dropoutGraceMs: 160,
};

export class GestureStabilizer {
  private candidate: GestureName = 'None';
  private candidateSince = 0;
  private latched: GestureName = 'None';
  private neutralSince = 0;
  private lastCandidateSeen = 0;

  constructor(private readonly options: GestureStabilizerOptions) {}

  update(sample: GestureSample): StableGestureEvent[] {
    const output: StableGestureEvent[] = [];
    if (!sample.handPresent) {
      if (this.candidate !== 'None' || this.latched !== 'None') {
        output.push({ type: 'hand-lost', gesture: this.latched || this.candidate });
      }
      this.candidate = 'None';
      this.latched = 'None';
      this.candidateSince = 0;
      this.lastCandidateSeen = 0;
      this.neutralSince = sample.timestamp;
      return output;
    }

    const effective = sample.confidence >= this.options.confidenceThreshold ? sample.name : 'None';
    if (effective === 'None') {
      if (this.candidate !== 'None' && sample.timestamp - this.lastCandidateSeen <= (this.options.dropoutGraceMs ?? 0)) {
        return output;
      }
      if (this.neutralSince === 0) this.neutralSince = sample.timestamp;
      if (this.latched !== 'None' && sample.timestamp - this.neutralSince >= this.options.releaseMs) {
        output.push({ type: 'released', gesture: this.latched });
        this.latched = 'None';
      }
      this.candidate = 'None';
      this.lastCandidateSeen = 0;
      return output;
    }

    this.neutralSince = 0;
    if (effective === this.latched) return output;
    if (effective !== this.candidate) {
      this.candidate = effective;
      this.candidateSince = sample.timestamp;
      this.lastCandidateSeen = sample.timestamp;
      output.push({ type: 'candidate', gesture: effective });
      return output;
    }
    this.lastCandidateSeen = sample.timestamp;
    if (sample.timestamp - this.candidateSince >= this.options.holdMs) {
      this.latched = effective;
      this.candidate = 'None';
      output.push({ type: 'confirmed', gesture: effective });
    }
    return output;
  }
}
