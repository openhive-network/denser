const UPLOAD_FAILED_URL = 'UPLOAD FAILED';

/** Markdown for an uploaded image, or a visible placeholder when `url` is empty (the upload failed). */
export const imageMarkdown = (name: string, url: string): string => `![${name}](${url || UPLOAD_FAILED_URL})`;

/** Whether `body` still holds a failed-upload placeholder, which must not be broadcast. */
export const hasFailedUploadPlaceholder = (body: string): boolean => body.includes(`](${UPLOAD_FAILED_URL})`);
