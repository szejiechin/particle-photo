import type { PixelImage } from '../analysis/types';
import { AppError } from '../../errors';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png']);

export function detectImageMime(bytes: Uint8Array): 'image/jpeg' | 'image/png' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return 'image/png';
  return null;
}

export async function decodeImage(bytes: Uint8Array, declaredMime?: string): Promise<{ image: PixelImage; mimeType: string; previewUrl: string }> {
  const mimeType = detectImageMime(bytes) ?? (declaredMime && allowedMimeTypes.has(declaredMime) ? declaredMime : null);
  if (!mimeType) throw new AppError('UNSUPPORTED_IMAGE');
  const blob = new Blob([new Uint8Array(bytes)], { type: mimeType });
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch (error) {
    throw new AppError('IMAGE_DECODE_FAILED', { cause: error });
  }
  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Image decoding is not available on this device.');
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const data = context.getImageData(0, 0, width, height);
  return {
    image: { width, height, rgba: data.data },
    mimeType,
    previewUrl: URL.createObjectURL(blob),
  };
}
