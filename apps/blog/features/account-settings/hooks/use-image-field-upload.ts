import { useCallback, useState } from 'react';
import { useSignerContext } from '@smart-signer/components/signer-provider';
import { IMAGE_MAX_DIMENSION, processAndUploadImg } from '../lib/utils';

export type ImageField = keyof typeof IMAGE_MAX_DIMENSION;

/** The upload in flight: which field it fills and the percentage sent, null until the first progress event. */
export interface ImageFieldUploadState {
  field: ImageField;
  percent: number | null;
}

/**
 * Uploads an image for the profile or cover field, tracking progress and the last failed field.
 * `onUploaded` receives the new image URL; on failure the field keeps its value.
 */
export function useImageFieldUpload(username: string, onUploaded: (field: ImageField, url: string) => void) {
  const { loadSigner } = useSignerContext();
  const [upload, setUpload] = useState<ImageFieldUploadState | null>(null);
  const [failedField, setFailedField] = useState<ImageField | null>(null);

  const uploadImage = useCallback(
    async (field: ImageField, file: File) => {
      setFailedField(null);
      setUpload({ field, percent: null });
      try {
        const url = await processAndUploadImg(file, username, loadSigner, {
          maxDimension: IMAGE_MAX_DIMENSION[field],
          onProgress: (percent) => setUpload({ field, percent })
        });
        onUploaded(field, url);
      } catch {
        // processAndUploadImg has logged the error; the form shows the failure
        setFailedField(field);
      } finally {
        setUpload(null);
      }
    },
    [username, loadSigner, onUploaded]
  );

  return { upload, failedField, uploadImage };
}
