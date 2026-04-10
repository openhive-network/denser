import { getRenderer, getPreviewRenderer } from '@/blog/features/post-rendering/lib/renderer';
import { Signer } from '@smart-signer/lib/signer/signer';
import { configuredImagesEndpoint } from '@ui/config/public-vars';
import { handleError } from '@ui/lib/handle-error';
import { getLogger } from '@ui/lib/logging';
import { isCommunity } from '@ui/lib/utils';
import { TFunction } from 'i18next';
import { Dispatch, SetStateAction } from 'react';
import { processImageForUpload } from './image-processing';
import type { BatchFileItem, FileProcessingStatus, ProcessingOptions } from './image-processing-types';

const logger = getLogger('app');

export const MAX_TAGS = 8;
/**
 * Normalizes a raw tag input string by replacing commas with spaces
 * and collapsing multiple spaces into one.
 */
export function normalizeTagInput(value: string): string {
  return value.replace(/,/g, ' ').replace(/ {2,}/g, ' ');
}

/**
 * Parses a normalized tag string into an array of non-empty tags.
 */
export function parseTags(value: string): string[] {
  return normalizeTagInput(value)
    .trim()
    .replace(/#/g, '')
    .split(/ +/)
    .filter(Boolean);
}

export function validateTagInput(value: string, required: boolean, t: TFunction<'common_blog', undefined>) {
  if (!value || value.trim() === '') return required ? t('submit_page.category_selector.required') : null;
  const tags = parseTags(value);
  return tags.length > MAX_TAGS
    ? t('submit_page.category_selector.use_limited_amount_of_categories', {
        amount: MAX_TAGS
      })
    : tags.find((c) => c.length > 24)
      ? t('submit_page.category_selector.maximum_tag_length_is_24_characters')
      : tags.find((c) => c.split('-').length > 2)
        ? t('submit_page.category_selector.use_one_dash')
        : tags.find((c) => /[A-Z]/.test(c))
          ? t('submit_page.category_selector.use_only_lowercase_letters')
          : tags.find((c) => !/^[a-z0-9-#]+$/.test(c))
            ? t('submit_page.category_selector.use_only_allowed_characters')
            : tags.find((c) => !/^[a-z-#]/.test(c))
              ? t('submit_page.category_selector.must_start_with_a_letter')
              : tags.find((c) => !/[a-z0-9]$/.test(c))
                ? t('submit_page.category_selector.must_end_with_a_letter_or_number')
                : tags.filter((c) => isCommunity(c)).length > 0
                  ? t('submit_page.category_selector.must_not_include_hivemind_community_owner')
                  : tags.reduce((acc, tag, index, array) => {
                        const isDuplicate = array.slice(index + 1).some((b) => b === tag);
                        return acc || isDuplicate;
                      }, false)
                    ? t('submit_page.category_selector.tags_cannot_be_repeated')
                    : null;
}

export function validateSummaryInput(value: string, t: TFunction<'common_wallet', undefined>) {
  const markdownRegex = /(?:\*[\w\s]*\*|#[\w\s]*#|_[\w\s]*_|~[\w\s]*~|\]\s*\(|\]\s*\[)/;
  const htmlTagRegex = /<\/?[\w\s="/.':;#-/?]+>/gi;
  return markdownRegex.test(value)
    ? t('submit_page.markdown_not_supported')
    : htmlTagRegex.test(value)
      ? t('submit_page.html_not_supported')
      : null;
}

export function validateAltUsernameInput(value: string, t: TFunction<'common_wallet', undefined>) {
  const altAuthorAllowedCharactersRegex = /^[\w.\d-]+$/;
  return value !== '' && !altAuthorAllowedCharactersRegex.test(value)
    ? t('submit_page.must_contain_only')
    : null;
}
export function imagePicker(img: string) {
  const checkImg = img.startsWith('youtu-') ? `https://img.youtube.com/vi/${img.slice(6)}/0.jpg` : img;
  return checkImg;
}

/**
 * Finds all images in markdown content, so also in html content, and
 * returns their `src` attribute.
 *
 * @export
 * @param {string} markdownContent
 * @return {*}  {string[]}
 */
export function extractImagesSrc(markdownContent: string, proxyAuthToken?: string): string[] {
  if (markdownContent === '') return [];
  const parser = new DOMParser();
  const renderer = proxyAuthToken ? getPreviewRenderer(proxyAuthToken) : getRenderer('');
  const doc = parser.parseFromString(renderer.render(markdownContent), 'text/html');
  const images = doc.getElementsByTagName('img');
  const result = [];
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    // Skip images inside YouTube facade - these are auto-generated thumbnails
    // User-explicitly added YouTube thumbnail images (standalone) are still included
    if (img.closest('.youtube-facade')) continue;
    result.push(img.src);
  }
  return result;
}

export function maxAcceptedPayout(customValue: number | string | undefined, maxPayout: string) {
  switch (maxPayout) {
    case 'no_max':
      return 1000000;
    case '0':
      return 0;
    case 'custom':
      return customValue === '0' ? 1000000 : Number(customValue);
  }
  return 1000000;
}

/**
 * Uploads image to Imagehoster, see
 * https://gitlab.syncad.com/hive/imagehoster. Function returns url to
 * image on server or empty string in case of any error.
 *
 * @param {File} file
 * @param {string} username
 * @param {Signer} signer
 * @returns {Promise<string>}
 */
const uploadImg = async (file: File, username: string, signer: Signer): Promise<string> => {
  try {
    if (!file)
      throw new Error("No file provided");

    const fileData = await new Promise<Uint8Array>((resolve) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        // reader.result is an ArrayBuffer; convert to Uint8Array immediately
        resolve(new Uint8Array(reader.result as ArrayBuffer));
      });
      reader.readAsArrayBuffer(file);
    });

    const formData = new FormData();
    formData.append('file', file);

    // 3. Create prefix using TextEncoder (Native alternative to Buffer.from)
    const encoder = new TextEncoder();
    const prefix = encoder.encode('ImageSigningChallenge');

    // 4. Standardized Concatenation
    // Create a container of the total size
    const buf = new Uint8Array(prefix.length + fileData.length);

    // Copy prefix to the start, and fileData right after it
    buf.set(prefix, 0);
    buf.set(fileData, prefix.length);

    const sig = await signer.signChallenge({
      message: buf,
      password: ''
    });

    const imageOwner = signer.authorityUsername || signer.username;

    const postUrl = `${configuredImagesEndpoint}/${imageOwner}/${sig}`;

    const response = await fetch(postUrl, { method: 'POST', body: formData });
    const resJSON = await response.json();
    return resJSON.url;
  } catch (error) {
    logger.error('Error when uploading file %s: %o', file.name, error);
    handleError(error);
  }
  return '';
};

export const onImageUpload = async (
  file: File,
  insertText: (text: string, pos?: number) => void,
  username: string,
  signer: Signer,
  setUploading?: Dispatch<SetStateAction<boolean>>,
  cursorPos?: number,
  processingOptions?: ProcessingOptions
) => {
  setUploading?.(true);
  try {
    const result = await processImageForUpload(file, processingOptions);
    const url = await uploadImg(result.file, username, signer);
    const name = result.file.name;
    const imageMarkdown = ` ![${name}](${!url ? 'UPLOAD FAILED' : url}) `;
    insertText(imageMarkdown, cursorPos);
  } catch (error) {
    logger.error('Image processing/upload failed for %s: %o', file.name, error);
    handleError(error);
    insertText(` ![${file.name}](UPLOAD FAILED) `, cursorPos);
  }
  setUploading?.(false);
};

export const onImageDrop = async (
  dataTransfer: DataTransfer,
  insertText: (text: string, pos?: number) => void,
  username: string,
  signer: Signer,
  setUploading?: Dispatch<SetStateAction<boolean>>,
  cursorPos?: number,
  processingOptions?: ProcessingOptions
) => {
  const files: File[] = [];
  for (let index = 0; index < dataTransfer.items.length; index++) {
    const file = dataTransfer.files.item(index);
    if (file) files.push(file);
  }

  if (files.length === 1) {
    await onImageUpload(files[0], insertText, username, signer, setUploading, cursorPos, processingOptions);
    return;
  }

  // Multiple files: block format with empty lines, sequential for mobile memory
  setUploading?.(true);
  let insertOffset = 0;
  for (const file of files) {
    try {
      const result = await processImageForUpload(file, processingOptions);
      const url = await uploadImg(result.file, username, signer);
      const name = result.file.name;
      const markdown = `![${name}](${!url ? 'UPLOAD FAILED' : url})\n\n`;
      const adjustedPos = cursorPos !== undefined ? cursorPos + insertOffset : undefined;
      insertText(markdown, adjustedPos);
      insertOffset += markdown.length;
    } catch (error) {
      logger.error('Image processing/upload failed for %s: %o', file.name, error);
      handleError(error);
      const markdown = `![${file.name}](UPLOAD FAILED)\n\n`;
      const adjustedPos = cursorPos !== undefined ? cursorPos + insertOffset : undefined;
      insertText(markdown, adjustedPos);
      insertOffset += markdown.length;
    }
  }
  setUploading?.(false);
};

export const onImagePaste = async (
  clipboardData: DataTransfer,
  insertText: (text: string, pos?: number) => void,
  username: string,
  signer: Signer,
  setUploading?: Dispatch<SetStateAction<boolean>>,
  cursorPos?: number,
  processingOptions?: ProcessingOptions
) => {
  const files: File[] = [];
  for (let i = 0; i < clipboardData.items.length; i++) {
    const item = clipboardData.items[i];
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) files.push(file);
    }
  }
  if (!files.length) return false;

  if (files.length === 1) {
    await onImageUpload(files[0], insertText, username, signer, setUploading, cursorPos, processingOptions);
    return true;
  }

  // Multiple files: block format with empty lines, sequential for mobile memory
  setUploading?.(true);
  let insertOffset = 0;
  for (const file of files) {
    try {
      const result = await processImageForUpload(file, processingOptions);
      const url = await uploadImg(result.file, username, signer);
      const name = result.file.name;
      const markdown = `![${name}](${!url ? 'UPLOAD FAILED' : url})\n\n`;
      const adjustedPos = cursorPos !== undefined ? cursorPos + insertOffset : undefined;
      insertText(markdown, adjustedPos);
      insertOffset += markdown.length;
    } catch (error) {
      logger.error('Image processing/upload failed for %s: %o', file.name, error);
      handleError(error);
      const markdown = `![${file.name}](UPLOAD FAILED)\n\n`;
      const adjustedPos = cursorPos !== undefined ? cursorPos + insertOffset : undefined;
      insertText(markdown, adjustedPos);
      insertOffset += markdown.length;
    }
  }
  setUploading?.(false);
  return true;
};

// insertToTextArea removed - caused #672 by DOM manipulation instead of React state

export interface BatchUploadCallbacks {
  onFileStart: (index: number, file: File) => void;
  onFileProgress: (index: number, status: FileProcessingStatus) => void;
  onFileComplete: (index: number, url: string, name: string) => void;
  onFileError: (index: number, error: string) => void;
  onAllComplete: () => void;
}

export const onBatchImageUpload = async (
  files: File[],
  insertText: (text: string, pos?: number) => void,
  username: string,
  signer: Signer,
  callbacks: BatchUploadCallbacks,
  cursorPos?: number,
  processingOptions?: ProcessingOptions
) => {
  let insertOffset = 0;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    callbacks.onFileStart(i, file);
    try {
      callbacks.onFileProgress(i, 'processing');
      const result = await processImageForUpload(file, processingOptions);

      callbacks.onFileProgress(i, 'uploading');
      const url = await uploadImg(result.file, username, signer);
      const name = result.file.name;

      if (url) {
        const markdown = `![${name}](${url})\n\n`;
        const adjustedPos = cursorPos !== undefined ? cursorPos + insertOffset : undefined;
        insertText(markdown, adjustedPos);
        insertOffset += markdown.length;
        callbacks.onFileComplete(i, url, name);
      } else {
        callbacks.onFileError(i, 'Upload returned empty URL');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      callbacks.onFileError(i, msg);
      logger.error('Batch upload file %d (%s) failed: %o', i, file.name, error);
    }
  }
  callbacks.onAllComplete();
};

export type { BatchFileItem, FileProcessingStatus, ProcessingOptions };

export const postClassName =
  'font-source text-[16.5px] prose-h1:text-[26.4px] prose-h2:text-[23.1px] prose-h3:text-[19.8px] prose-h4:text-[18.1px] sm:text-[17.6px] sm:prose-h1:text-[28px] sm:prose-h2:text-[24.7px] sm:prose-h3:text-[22.1px] sm:prose-h4:text-[19.4px] lg:text-[19.2px] lg:prose-h1:text-[30.7px] lg:prose-h2:text-[28.9px] lg:prose-h3:text-[23px] lg:prose-h4:text-[21.1px] prose-p:mb-6 prose-p:mt-0 prose-img:cursor-pointer prose-img:max-w-full prose-img:h-auto';
