/**
 * Client-side image processing pipeline for upload optimization.
 *
 * Handles HEIC/HEIF conversion, resizing, and compression before upload
 * to the imagehoster. All processing is transparent to the imagehoster —
 * it receives a standard JPEG/PNG/WebP file.
 */

import { getLogger } from '@ui/lib/logging';
import type { DetectedFormat, ProcessingOptions, ProcessingResult } from './image-processing-types';

const logger = getLogger('image-processing');

const DEFAULT_MAX_DIMENSION = 3840;
const DEFAULT_JPEG_QUALITY = 0.85;
const DEFAULT_MAX_FILE_SIZE = 6_000_000; // 6MB
const IMAGEHOSTER_MAX_SIZE = 15_000_000; // 15MB hard limit

/**
 * Detect image format from magic bytes (first 12 bytes of file).
 * More reliable than MIME type or file extension.
 */
export function detectImageFormat(header: Uint8Array): DetectedFormat {
  if (header.length < 4) return 'unknown';

  // JPEG: FF D8 FF
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return 'jpeg';
  }

  // PNG: 89 50 4E 47
  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) {
    return 'png';
  }

  // GIF: 47 49 46 38 (GIF87a or GIF89a)
  if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x38) {
    return 'gif';
  }

  // WebP: RIFF....WEBP
  if (
    header.length >= 12 &&
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50
  ) {
    return 'webp';
  }

  // HEIC/HEIF: ftyp box — bytes 4-7 are "ftyp", then brand code
  if (
    header.length >= 12 &&
    header[4] === 0x66 &&
    header[5] === 0x74 &&
    header[6] === 0x79 &&
    header[7] === 0x70
  ) {
    const brand = String.fromCharCode(header[8], header[9], header[10], header[11]);
    if (brand === 'heic' || brand === 'heix' || brand === 'heim' || brand === 'heis') {
      return 'heic';
    }
    if (brand === 'mif1' || brand === 'msf1' || brand === 'hevc' || brand === 'hevx') {
      return 'heif';
    }
  }

  // SVG: check for <svg (skip BOM/whitespace)
  const text = new TextDecoder().decode(header.slice(0, 12));
  if (text.trimStart().startsWith('<svg') || text.trimStart().startsWith('<?xml')) {
    return 'svg';
  }

  return 'unknown';
}

/**
 * Lazy-load heic2any and decode HEIC/HEIF blob to JPEG.
 * The WASM module (~1.2MB) is loaded only on first call.
 */
async function decodeHeic(blob: Blob): Promise<Blob> {
  const heic2any = (await import('heic2any')).default;
  const result = await heic2any({
    blob,
    toType: 'image/jpeg',
    quality: 0.92 // Higher quality here; final encode at target quality happens after resize
  });
  // heic2any may return Blob[] for multi-image HEIF containers
  return Array.isArray(result) ? result[0] : result;
}

/**
 * Resize image using createImageBitmap (decodes off main thread).
 * Returns null if no resize is needed.
 */
async function resizeImage(
  source: Blob,
  maxDimension: number
): Promise<{ bitmap: ImageBitmap; width: number; height: number } | null> {
  const bitmap = await createImageBitmap(source);
  const { width, height } = bitmap;

  if (width <= maxDimension && height <= maxDimension) {
    bitmap.close();
    return null;
  }

  const scale = maxDimension / Math.max(width, height);
  const newWidth = Math.round(width * scale);
  const newHeight = Math.round(height * scale);
  bitmap.close();

  const resized = await createImageBitmap(source, {
    resizeWidth: newWidth,
    resizeHeight: newHeight,
    resizeQuality: 'high'
  });

  return { bitmap: resized, width: newWidth, height: newHeight };
}

/**
 * Encode ImageBitmap to Blob via canvas.
 * Uses OffscreenCanvas where available, falls back to DOM canvas.
 */
async function encodeToBlob(
  bitmap: ImageBitmap,
  format: 'image/jpeg' | 'image/png' | 'image/webp',
  quality: number
): Promise<Blob> {
  const qualityParam = format === 'image/png' ? undefined : quality;

  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get OffscreenCanvas 2d context');
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    return canvas.convertToBlob({ type: format, quality: qualityParam });
  }

  // Fallback: DOM canvas
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas 2d context');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('canvas.toBlob returned null'))),
      format,
      qualityParam
    );
  });
}

/** Replace file extension, preserving the base name */
function replaceExtension(filename: string, newExt: string): string {
  const dotIdx = filename.lastIndexOf('.');
  const base = dotIdx > 0 ? filename.slice(0, dotIdx) : filename;
  return base + newExt;
}

/**
 * Main processing pipeline. Detects format, converts HEIC, resizes, and
 * compresses as needed. Returns a ProcessingResult with the file ready
 * for upload to the imagehoster.
 *
 * @param file - The original File from the user
 * @param options - Processing options (all optional with sensible defaults)
 */
export async function processImageForUpload(
  file: File,
  options?: ProcessingOptions
): Promise<ProcessingResult> {
  const maxDimension = options?.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const jpegQuality = options?.jpegQuality ?? DEFAULT_JPEG_QUALITY;
  const maxFileSize = options?.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;
  const optimize = options?.optimize ?? true;

  const passthrough: ProcessingResult = {
    file,
    wasProcessed: false,
    originalSize: file.size,
    finalSize: file.size
  };

  // 1. Read magic bytes
  const headerSlice = file.slice(0, 12);
  const header = new Uint8Array(await headerSlice.arrayBuffer());
  const format = detectImageFormat(header);

  // 2. GIF — never process (would destroy animation)
  if (format === 'gif') {
    if (file.size > IMAGEHOSTER_MAX_SIZE) {
      throw new Error(`GIF is too large (${formatBytes(file.size)}). Maximum is ${formatBytes(IMAGEHOSTER_MAX_SIZE)}.`);
    }
    return passthrough;
  }

  // 3. SVG — pass through (vector, no pixels)
  if (format === 'svg') {
    return passthrough;
  }

  // 4. HEIC/HEIF — always convert
  let sourceBlob: Blob = file;
  let currentFormat: DetectedFormat = format;

  if (format === 'heic' || format === 'heif') {
    logger.info('Converting HEIC/HEIF image: %s (%s)', file.name, formatBytes(file.size));
    sourceBlob = await decodeHeic(file);
    currentFormat = 'jpeg';
  }

  // 5. Determine output MIME type: PNG stays PNG, everything else → its own type
  //    (JPEG stays JPEG, WebP stays WebP). HEIC was already converted to JPEG above.
  const outputMime: 'image/jpeg' | 'image/png' | 'image/webp' =
    currentFormat === 'png'
      ? 'image/png'
      : currentFormat === 'webp'
        ? 'image/webp'
        : 'image/jpeg';

  // 6. Check if we need to resize/encode
  const bitmap = await createImageBitmap(sourceBlob);
  const origW = bitmap.width;
  const origH = bitmap.height;
  bitmap.close();

  const oversized = origW > maxDimension || origH > maxDimension;
  const overweight = file.size > maxFileSize;
  const wasConverted = format === 'heic' || format === 'heif';

  // Only process when there's a reason to:
  // - optimize mode is on (user wants all images compressed)
  // - image was HEIC (needs encoding regardless)
  // - image exceeds size or dimension limits
  const shouldProcess = optimize || wasConverted || oversized || overweight;

  if (!shouldProcess) {
    return passthrough;
  }

  // 7. Resize if needed
  let finalBitmap: ImageBitmap;
  if (oversized) {
    const resizeResult = await resizeImage(sourceBlob, maxDimension);
    // resizeImage returns null if already within bounds, but we checked oversized above
    finalBitmap = resizeResult!.bitmap;
  } else {
    finalBitmap = await createImageBitmap(sourceBlob);
  }

  // 8. Encode to output format
  const outputBlob = await encodeToBlob(finalBitmap, outputMime, jpegQuality);

  // 9. If encoding made the file larger (can happen with PNGs), keep original
  if (!wasConverted && !oversized && outputBlob.size >= file.size) {
    logger.info('Processing would increase file size, keeping original: %s', file.name);
    return passthrough;
  }

  // 10. Build output File
  const ext = outputMime === 'image/png' ? '.png' : outputMime === 'image/webp' ? '.webp' : '.jpg';
  const outputName = replaceExtension(file.name, ext);
  const outputFile = new File([outputBlob], outputName, { type: outputMime });

  logger.info(
    'Processed image: %s → %s (%s → %s)',
    file.name,
    outputName,
    formatBytes(file.size),
    formatBytes(outputFile.size)
  );

  return {
    file: outputFile,
    wasProcessed: true,
    originalSize: file.size,
    finalSize: outputFile.size
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
