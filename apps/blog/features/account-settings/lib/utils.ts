import type { LoadSigner } from '@smart-signer/lib/use-lazy-signer';
import { TFunction } from 'i18next';
import { configuredImagesEndpoint } from '@hive/ui/config/public-vars';
import { getLogger } from '@ui/lib/logging';
import { processImageForUpload } from '@/blog/features/post-editor/lib/image-processing';
import { postImageWithProgress } from './post-with-progress';
import {
  SOCIAL_KEYS,
  type SocialHandles,
  type SocialKey,
  normalizeSocialHandle,
  parseSocialHandles
} from '@/blog/features/layouts/user-profile/lib/social-links';

const logger = getLogger('account-settings/utils');

export interface Settings {
  profile_image: string;
  cover_image: string;
  name: string;
  about: string;
  location: string;
  website: string;
  blacklist_description: string;
  muted_list_description: string;
  social: Record<SocialKey, string>;
}

const EMPTY_SOCIAL: Record<SocialKey, string> = { x: '', ig: '', yt: '', tg: '', bsky: '', dc: '', nostr: '' };

export const DEFAULT_SETTINGS: Settings = {
  profile_image: '',
  cover_image: '',
  name: '',
  about: '',
  location: '',
  website: '',
  blacklist_description: '',
  muted_list_description: '',
  social: EMPTY_SOCIAL
};

export const DEFAULT_AI_ENDPOINTS = [
  'https://api.hive.blog',
  'https://api.syncad.com',
  'https://api.openhive.network',
  'https://api.dev.openhive.network'
];

export function validation(values: Settings, t: TFunction<'common_blog'>) {
  return {
    profile_image:
      values.profile_image && !/^https?:\/\//.test(values.profile_image)
        ? t('settings_page.invalid_url')
        : null,
    cover_image:
      values.cover_image && !/^https?:\/\//.test(values.cover_image) ? t('settings_page.invalid_url') : null,
    name:
      values.name && values.name.length > 20
        ? t('settings_page.name_is_too_long')
        : values.name && /^\s*@/.test(values.name)
          ? t('settings_page.name_must_not_begin_with')
          : null,
    about: values.about && values.about.length > 160 ? t('settings_page.about_is_too_long') : null,
    location: values.location && values.location.length > 30 ? t('settings_page.location_is_too_long') : null,
    website:
      values.website && values.website.length > 100
        ? t('settings_page.website_url_is_too_long')
        : values.website && !/^https?:\/\//.test(values.website)
          ? t('settings_page.invalid_url')
          : null,
    blacklist_description:
      values.blacklist_description && values.blacklist_description.length > 256
        ? t('settings_page.description_is_too_long')
        : null,
    muted_list_description:
      values.muted_list_description && values.muted_list_description.length > 256
        ? t('settings_page.description_is_too_long')
        : null
  };
}

/** Per-platform error message for each social field holding an invalid handle. */
export function socialValidation(
  social: Settings['social'],
  t: TFunction<'common_blog'>
): Partial<Record<SocialKey, string>> {
  const errors: Partial<Record<SocialKey, string>> = {};
  for (const key of SOCIAL_KEYS) {
    if (social[key].trim() && !normalizeSocialHandle(key, social[key])) {
      errors[key] = t('settings_page.invalid_social_handle');
    }
  }
  return errors;
}

/** The form's social fields, prefilled from the handles in `posting_json_metadata`. */
export function socialSettingsFromMetadata(postingJsonMetadata: string | undefined): Settings['social'] {
  return { ...EMPTY_SOCIAL, ...parseSocialHandles(postingJsonMetadata) };
}

/** Normalized, sparse handles to save: empty fields are omitted. */
export function socialHandlesToSave(social: Settings['social']): SocialHandles {
  const handles: SocialHandles = {};
  for (const key of SOCIAL_KEYS) {
    const handle = normalizeSocialHandle(key, social[key]);
    if (handle) handles[key] = handle;
  }
  return handles;
}

const SIGNING_CHALLENGE_PREFIX = 'ImageSigningChallenge';

/** Longest side, in pixels, an uploaded image is downscaled to before upload. */
export const IMAGE_MAX_DIMENSION: Record<'profile_image' | 'cover_image', number> = {
  profile_image: 1024,
  cover_image: 2048
};

/**
 * Signs `file` with the user's key and uploads it to the imagehoster, reporting the
 * percentage sent through `onProgress`. Resolves to the uploaded image's URL.
 *
 * @throws ImageUploadError when the upload fails; signing errors propagate as thrown by the signer
 */
const uploadImg = async (
  file: File,
  username: string,
  loadSigner: LoadSigner,
  onProgress: (percent: number) => void
): Promise<string> => {
  const data = new Uint8Array(await file.arrayBuffer());
  const prefix = new TextEncoder().encode(SIGNING_CHALLENGE_PREFIX);
  const challenge = new Uint8Array(prefix.length + data.length);
  challenge.set(prefix);
  challenge.set(data, prefix.length);

  const signer = await loadSigner();
  const sig = await signer.signChallenge({ message: challenge, password: '' });

  const formData = new FormData();
  formData.append('file', file);
  return postImageWithProgress(`${configuredImagesEndpoint}/${username}/${sig}`, formData, onProgress);
};

/**
 * Processes the image (converts HEIC, downscales to `maxDimension`, compresses), then uploads it.
 * Errors are logged and rethrown for the caller to show.
 */
export const processAndUploadImg = async (
  file: File,
  username: string,
  loadSigner: LoadSigner,
  { maxDimension, onProgress }: { maxDimension: number; onProgress: (percent: number) => void }
): Promise<string> => {
  try {
    const result = await processImageForUpload(file, { optimize: true, maxDimension });
    return await uploadImg(result.file, username, loadSigner, onProgress);
  } catch (error) {
    logger.error('Error when uploading file %s: %o', file.name, error);
    throw error;
  }
};
