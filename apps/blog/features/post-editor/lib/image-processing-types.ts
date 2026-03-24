/** Detected image format from magic bytes */
export type DetectedFormat = 'jpeg' | 'png' | 'gif' | 'webp' | 'heic' | 'heif' | 'svg' | 'unknown';

/** Per-file processing status for batch upload UI */
export type FileProcessingStatus = 'pending' | 'processing' | 'uploading' | 'done' | 'error';

export interface ProcessingResult {
  /** The file ready for upload (may be the original if no processing needed) */
  file: File;
  /** Whether any processing was performed */
  wasProcessed: boolean;
  /** Original size in bytes */
  originalSize: number;
  /** Final size in bytes */
  finalSize: number;
}

export interface ProcessingOptions {
  /** Maximum dimension on longest side. Default: 3840 */
  maxDimension?: number;
  /** JPEG quality 0-1. Default: 0.85 */
  jpegQuality?: number;
  /** Maximum file size in bytes before forced processing. Default: 6_000_000 */
  maxFileSize?: number;
  /** When true, always resize+compress (even small files). Default: true */
  optimize?: boolean;
}

export interface BatchFileItem {
  id: string;
  originalFile: File;
  status: FileProcessingStatus;
  error: string | null;
  resultUrl: string | null;
}
