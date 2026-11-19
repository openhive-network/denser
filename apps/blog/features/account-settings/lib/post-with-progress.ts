/** The upload did not complete: a network failure, an error status or a reply without an image URL. */
export class ImageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageUploadError';
  }
}

function parseJsonObject(responseText: string): object | null {
  try {
    const body: unknown = JSON.parse(responseText);
    return typeof body === 'object' && body !== null ? body : null;
  } catch {
    // A non-JSON reply (an error page): the caller reports its status instead
    return null;
  }
}

function errorDetail(responseText: string): string {
  const body = parseJsonObject(responseText);
  return body && 'error' in body ? JSON.stringify(body.error) : '';
}

function imageUrlOf(responseText: string): string | null {
  const body = parseJsonObject(responseText);
  return body && 'url' in body && typeof body.url === 'string' && body.url ? body.url : null;
}

/**
 * POSTs `body` to the imagehoster at `url` and resolves to the uploaded image's URL.
 * `onProgress` receives the percentage of the request body sent so far (0-100).
 * Uses XMLHttpRequest because fetch reports no upload progress.
 *
 * @throws ImageUploadError when the request fails, answers an error status or carries no `url`
 */
export function postImageWithProgress(
  url: string,
  body: FormData,
  onProgress: (percent: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && event.total > 0) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    xhr.addEventListener('load', () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new ImageUploadError(`Imagehoster answered ${xhr.status} ${errorDetail(xhr.responseText)}`.trim()));
        return;
      }
      const imageUrl = imageUrlOf(xhr.responseText);
      if (imageUrl) resolve(imageUrl);
      else reject(new ImageUploadError('Imagehoster reply carries no image URL'));
    });
    xhr.addEventListener('error', () => reject(new ImageUploadError('Image upload failed: network error')));
    xhr.addEventListener('abort', () => reject(new ImageUploadError('Image upload was aborted')));
    xhr.open('POST', url);
    xhr.send(body);
  });
}
