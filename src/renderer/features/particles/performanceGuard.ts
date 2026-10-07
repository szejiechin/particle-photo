export class PerformanceGuard {
  private slowSamples = 0;

  constructor(private readonly minimumFps = 30, private readonly samplesRequired = 3) {}

  update(fps: number): boolean {
    this.slowSamples = Number.isFinite(fps) && fps < this.minimumFps ? this.slowSamples + 1 : 0;
    return this.slowSamples >= this.samplesRequired;
  }
}
