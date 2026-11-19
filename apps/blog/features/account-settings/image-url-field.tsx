'use client';

import { ChangeEvent, MouseEvent } from 'react';
import { useTranslation } from '@/blog/i18n/client';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { Progress } from '@ui/components/progress';
import { CircleSpinner } from '@ui/components/circle-spinner';

const ACCEPTED_IMAGE_TYPES = '.jpg,.png,.jpeg,.jfif,.gif,.webp,.heic,.heif';

interface ImageUrlFieldProps {
  id: string;
  fileInputId: string;
  label: string;
  value: string;
  validationError: string | null;
  /** Percentage sent while this field's image uploads (null before the first progress event), undefined otherwise. */
  uploadPercent: number | null | undefined;
  uploadFailed: boolean;
  /** An upload is running: picking another file is blocked. */
  uploadBlocked: boolean;
  onChange: (value: string) => void;
  onFileSelected: (file: File) => void;
  onFilePickerClick: (event: MouseEvent<HTMLInputElement>) => void;
}

/** An image URL text field with an "Upload an image" picker and the upload's progress or failure. */
const ImageUrlField = ({
  id,
  fileInputId,
  label,
  value,
  validationError,
  uploadPercent,
  uploadFailed,
  uploadBlocked,
  onChange,
  onFileSelected,
  onFilePickerClick
}: ImageUrlFieldProps) => {
  const { t } = useTranslation('common_blog');
  const uploading = uploadPercent !== undefined;

  const handleTextChange = (event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value);
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.length === 1 ? event.target.files[0] : null;
    // Clear the picker so choosing the same file again fires another change
    event.target.value = '';
    if (file) onFileSelected(file);
  };

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input type="text" id={id} name={id} value={value} disabled={uploading} onChange={handleTextChange} />
      {uploading ? (
        <div className="flex flex-col gap-1 pt-1" role="status" data-testid={`${id}-upload-progress`}>
          <span className="flex items-center gap-2 text-sm">
            <CircleSpinner loading size={14} color="#dc2626" />
            {uploadPercent === null
              ? t('settings_page.uploading_image')
              : t('settings_page.uploading_image_percent', { percent: uploadPercent })}
          </span>
          {uploadPercent !== null && <Progress value={uploadPercent} className="h-1.5" />}
        </div>
      ) : (
        <span>
          <Label
            className={
              uploadBlocked
                ? 'text-sm font-normal text-muted-foreground'
                : 'text-sm font-normal text-destructive hover:cursor-pointer'
            }
            htmlFor={fileInputId}
          >
            {t('settings_page.upload_image')}
          </Label>
          <Input
            id={fileInputId}
            type="file"
            className="hidden"
            accept={ACCEPTED_IMAGE_TYPES}
            name={fileInputId}
            disabled={uploadBlocked}
            onClick={onFilePickerClick}
            onChange={handleFileChange}
          />
        </span>
      )}
      {uploadFailed && (
        <p className="pt-1 text-xs text-destructive" role="alert" data-testid={`${id}-upload-error`}>
          {t('settings_page.image_upload_failed')}
        </p>
      )}
      <span className="pt-2 text-xs text-destructive">{validationError}</span>
    </div>
  );
};

export default ImageUrlField;
