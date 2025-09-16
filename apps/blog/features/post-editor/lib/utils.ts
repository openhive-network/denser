import { getRenderer } from '@/blog/features/post-rendering/lib/renderer';
import { Signer } from '@smart-signer/lib/signer/signer';
import { configuredImagesEndpoint } from '@ui/config/public-vars';
import { getLogger } from '@ui/lib/logging';
import { TFunction } from 'i18next';
import { Dispatch, SetStateAction } from 'react';

const logger = getLogger('app');

export const MAX_TAGS = 8;
export function validateTagInput(value: string, required: boolean, t: TFunction<'common_blog', undefined>) {
  if (!value || value.trim() === '') return required ? t('submit_page.category_selector.required') : null;
  const tags = value.trim().replace(/#/g, '').split(/ +/);
  return tags.length > MAX_TAGS
    ? t('submit_page.category_selector.use_limited_amount_of_categories', {
        amount: MAX_TAGS
      })
    : tags.find((c) => c.length > 24)
      ? t('submit_page.category_selector.maximum_tag_length_is_24_characters')
      : tags.find((c) => c.split('-').length > 2)
        ? t('submit_page.category_selector.use_one_dash')
        : tags.find((c) => c.indexOf(',') >= 0)
          ? t('submit_page.category_selector.use_spaces_to_separate_tags')
          : tags.find((c) => /[A-Z]/.test(c))
            ? t('submit_page.category_selector.use_only_lowercase_letters')
            : tags.find((c) => !/^[a-z0-9-#]+$/.test(c))
              ? t('submit_page.category_selector.use_only_allowed_characters')
              : tags.find((c) => !/^[a-z-#]/.test(c))
                ? t('submit_page.category_selector.must_start_with_a_letter')
                : tags.find((c) => !/[a-z0-9]$/.test(c))
                  ? t('submit_page.category_selector.must_end_with_a_letter_or_number')
                  : tags.filter((c) => c.substring(0, 5) === 'hive-').length > 0
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
export function extractImagesSrc(markdownContent: string): string[] {
  if (markdownContent === '') return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(getRenderer('').render(markdownContent), 'text/html');
  const images = doc.getElementsByTagName('img');
  const result = [];
  for (let i = 0; i < images.length; i++) {
    // logger.info('extractImages found image src: %o', images[i].src);
    result.push(images[i].src);
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
    let data;

    if (file) {
      const reader = new FileReader();

      data = new Promise((resolve) => {
        reader.addEventListener('load', () => {
          const result = Buffer.from(reader.result!.toString(), 'binary');
          resolve(result);
        });
        reader.readAsBinaryString(file);
      });
    }

    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }

    data = await data;
    const prefix = Buffer.from('ImageSigningChallenge');
    const dataBuf = data as Buffer; // ensure Buffer
    const combined = new Uint8Array(prefix.length + dataBuf.length);
    combined.set(prefix, 0);
    combined.set(dataBuf, prefix.length);
    const buf = Buffer.from(combined);

    const sig = await signer.signChallenge({
      message: buf,
      password: ''
    });

    const imageOwner = signer.authorityUsername || signer.username;

    const postUrl = `${configuredImagesEndpoint}${imageOwner}/${sig}`;

    const response = await fetch(postUrl, { method: 'POST', body: formData });
    const resJSON = await response.json();
    return resJSON.url;
  } catch (error) {
    logger.error('Error when uploading file %s: %o', file.name, error);
  }
  return '';
};

export const onImageUpload = async (
  file: File,
  setMarkdown: Dispatch<SetStateAction<string>>,
  username: string,
  signer: Signer,
  htmlMode: boolean
) => {
  const url = await uploadImg(file, username, signer);
  if (htmlMode) {
    const insertHTML = insertToTextArea(`<img src="${url}" alt="${file.name}" />`);
    if (!insertHTML) return;
    setMarkdown(insertHTML);
  } else {
    const insertedMarkdown = insertToTextArea(` ![${file.name}](${url}) `);
    if (!insertedMarkdown) return;
    setMarkdown(insertedMarkdown);
  }
};

export const onImageDrop = async (
  dataTransfer: DataTransfer,
  setMarkdown: Dispatch<SetStateAction<string>>,
  username: string,
  signer: Signer,
  htmlMode: boolean
) => {
  const files = [];

  for (let index = 0; index < dataTransfer.items.length; index++) {
    const file = dataTransfer.files.item(index);
    if (file) files.push(file);
  }

  await Promise.all(files.map(async (file) => onImageUpload(file, setMarkdown, username, signer, htmlMode)));
};

export const onImagePaste = async (
  clipboardData: DataTransfer,
  setMarkdown: Dispatch<SetStateAction<string>>,
  username: string,
  signer: Signer,
  htmlMode: boolean
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
  await Promise.all(files.map(async (file) => onImageUpload(file, setMarkdown, username, signer, htmlMode)));
  return true;
};

export const insertToTextArea = (insertString: string) => {
  const textarea = document.querySelector('textarea');
  if (!textarea) {
    return null;
  }

  let sentence = textarea.value;
  const len = sentence.length;
  const pos = textarea.selectionStart;
  const end = textarea.selectionEnd;

  const front = sentence.slice(0, pos);
  const back = sentence.slice(pos, len);

  sentence = front + insertString + back;

  textarea.value = sentence;
  textarea.selectionEnd = end + insertString.length;

  return sentence;
};

export const postClassName =
  'font-source text-[16.5px] prose-h1:text-[26.4px] prose-h2:text-[23.1px] prose-h3:text-[19.8px] prose-h4:text-[18.1px] sm:text-[17.6px] sm:prose-h1:text-[28px] sm:prose-h2:text-[24.7px] sm:prose-h3:text-[22.1px] sm:prose-h4:text-[19.4px] lg:text-[19.2px] lg:prose-h1:text-[30.7px] lg:prose-h2:text-[28.9px] lg:prose-h3:text-[23px] lg:prose-h4:text-[21.1px] prose-p:mb-6 prose-p:mt-0 prose-img:cursor-pointer';
