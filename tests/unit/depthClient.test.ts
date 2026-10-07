import { describe, expect, it, vi } from 'vitest';
import { DepthClient } from '../../src/renderer/features/analysis/depthClient';
import type { DepthWorkerResponse } from '../../src/renderer/workers/contracts';

class FakeWorker {
  listener: ((event: MessageEvent<DepthWorkerResponse>) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  addEventListener(_type: string, listener: (event: MessageEvent<DepthWorkerResponse>) => void) { this.listener = listener; }
  removeEventListener(_type: string, listener: (event: MessageEvent<DepthWorkerResponse>) => void) { if (this.listener === listener) this.listener = null; }
  emit(data: DepthWorkerResponse) { this.listener?.({ data } as MessageEvent<DepthWorkerResponse>); }
}

describe('DepthClient', () => {
  it('resolves only the matching depth job', async () => {
    const worker = new FakeWorker();
    const client = new DepthClient(() => worker as unknown as Worker);
    const job = client.analyze(new ArrayBuffer(2), 'image/jpeg');
    worker.emit({ type: 'result', jobId: 1, width: 1, height: 1, values: new Float32Array([0.5]), durationMs: 10 });
    await expect(job.promise).resolves.toMatchObject({ depth: { width: 1, height: 1 }, durationMs: 10 });
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('rejects cancellation and detaches its listener', async () => {
    const worker = new FakeWorker();
    const client = new DepthClient(() => worker as unknown as Worker);
    const job = client.analyze(new ArrayBuffer(2), 'image/png');
    job.cancel();
    await expect(job.promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(worker.listener).toBeNull();
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});
