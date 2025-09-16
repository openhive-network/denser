import { createAsset } from '@transaction/lib/utils';
import { z } from 'zod';

export const MAX_TAGS = 8;

export const DEFAULT_FORM_VALUE: PostFormValues = {
  title: '',
  postArea: '',
  postSummary: '',
  tags: '',
  author: '',
  category: 'blog',
  beneficiaries: [],
  maxAcceptedPayout: 1000000,
  payoutType: '50%'
};

export function validateTagInput(value: string) {
  const tags = value.trim().replace(/#/g, '').split(/ +/);
  return tags.length > MAX_TAGS
    ? 'Use a limited amount of categories'
    : tags.find((c) => c.length > 24)
      ? 'Maximum tag length is 24 characters'
      : tags.find((c) => c.split('-').length > 2)
        ? 'Use one dash to separate categories'
        : tags.find((c) => c.indexOf(',') >= 0)
          ? 'Use spaces to separate tags'
          : tags.find((c) => /[A-Z]/.test(c))
            ? 'Use only lowercase letters'
            : tags.find((c) => !/^[a-z0-9-#]+$/.test(c))
              ? 'Use only allowed characters'
              : tags.find((c) => !/^[a-z-#]/.test(c))
                ? 'Must start with a letter'
                : tags.find((c) => !/[a-z0-9]$/.test(c))
                  ? 'Must end with a letter or number'
                  : tags.filter((c) => c.substring(0, 5) === 'hive-').length > 0
                    ? "Must not include 'hivemind' community owner"
                    : tags.reduce((acc, tag, index, array) => {
                          const isDuplicate = array.slice(index + 1).some((b) => b === tag);
                          return acc || isDuplicate;
                        }, false)
                      ? 'Tags cannot be repeated'
                      : null;
}

export function validateSummaryInput(value: string) {
  const markdownRegex = /(?:\*[\w\s]*\*|#[\w\s]*#|_[\w\s]*_|~[\w\s]*~|\]\s*\(|\]\s*\[)/;
  const htmlTagRegex = /<\/?[\w\s="/.':;#-/?]+>/gi;
  return markdownRegex.test(value)
    ? 'Markdown is not supported here'
    : htmlTagRegex.test(value)
      ? 'HTML is not supported here'
      : null;
}

export function validateAltUsernameInput(value: string) {
  const altAuthorAllowedCharactersRegex = /^[\w.\d-]+$/;
  return value !== '' && !altAuthorAllowedCharactersRegex.test(value)
    ? 'Must contain only letters and numbers'
    : null;
}
export function imagePicker(img: string) {
  const checkImg = img.startsWith('youtu-') ? `https://img.youtube.com/vi/${img.slice(6)}/0.jpg` : img;
  return checkImg;
}

export const generateMaxAcceptedPayout = (payoutType?: '0%' | '50%' | '100%', maxAcceptedPayout?: number) => {
  if (payoutType === '0%') return createAsset('0', 'HBD');
  return createAsset(((maxAcceptedPayout ?? 0) * 1000).toString(), 'HBD');
};

export const accountFormSchema = z.object({
  title: z
    .string()
    .min(2, 'String must contain at least 2 character(s)')
    .max(255, 'Maximum characters allowed is 255'),
  postArea: z.string().min(1, 'String must contain at least 1 character(s)'),
  postSummary: z
    .string()
    .max(140, 'Maximum characters allowed is 140')
    .superRefine((val, ctx) => {
      const err = validateSummaryInput(val);
      if (err) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: err
        });
      }
    }),
  tags: z.string().superRefine((val, ctx) => {
    const tagsCheck = validateTagInput(val);
    if (tagsCheck) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: tagsCheck
      });
    }
  }),
  author: z
    .string()
    .max(50, 'Maximum characters allowed is 50')
    .superRefine((val, ctx) => {
      const err = validateAltUsernameInput(val);
      if (err) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: err
        });
      }
    }),
  category: z.string(),
  beneficiaries: z
    .array(
      z.object({
        account: z.string(),
        weight: z.string()
      })
    )
    .optional(),
  maxAcceptedPayout: z.number().optional(),
  payoutType: z.enum(['0%', '50%', '100%']).optional()
});

export type PostFormValues = z.infer<typeof accountFormSchema>;

export type EditPostEntry = PostFormValues & { selectedImg?: string; permlink?: string };
