import { Signer } from '@smart-signer/lib/signer/signer';
import { TFunction } from 'i18next';
import { configuredImagesEndpoint } from '@hive/ui/config/public-vars';
import { getLogger } from '@ui/lib/logging';

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
}

export const DEFAULT_SETTINGS: Settings = {
  profile_image: '',
  cover_image: '',
  name: '',
  about: '',
  location: '',
  website: '',
  blacklist_description: '',
  muted_list_description: ''
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

export const uploadImg = async (file: File, username: string, signer: Signer): Promise<string> => {
  try {
    if (!file)
      throw new Error("No file provided");

    const data = await new Promise<Uint8Array>((resolve) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        // reader.result is an ArrayBuffer
        resolve(new Uint8Array(reader.result as ArrayBuffer));
      });
      reader.readAsArrayBuffer(file);
    });

    const formData = new FormData();
    formData.append('file', file);

    // 3. Create the prefix as a Uint8Array
    const encoder = new TextEncoder();
    const prefix = encoder.encode('ImageSigningChallenge');

    // 4. Concatenate without Buffer.concat
    // We create a new array of the total length and "set" the parts into it
    const buf = new Uint8Array(prefix.length + data.length);
    buf.set(prefix);
    buf.set(data, prefix.length);

    // 5. Sign (Works natively with Uint8Array)
    const sig = await signer.signChallenge({
      message: buf,
      password: ''
    });

    const postUrl = `${configuredImagesEndpoint}${username}/${sig}`;

    const response = await fetch(postUrl, { method: 'POST', body: formData });
    const resJSON = await response.json();
    return resJSON.url;
  } catch (error) {
    logger.error('Error when uploading file %s: %o', file.name, error);
  }
  return '';
};
