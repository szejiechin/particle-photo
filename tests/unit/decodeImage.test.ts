import { describe, expect, it } from 'vitest';
import { detectImageMime } from '../../src/renderer/features/upload/decodeImage';

describe('image signature validation', () => {
  it('recognizes JPEG and PNG signatures', () => {
    expect(detectImageMime(new Uint8Array([0xff, 0xd8, 0xff, 0x00]))).toBe('image/jpeg');
    expect(detectImageMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
  });

  it('rejects extension-only or corrupted data', () => {
    expect(detectImageMime(new Uint8Array([1, 2, 3, 4]))).toBeNull();
  });
});
