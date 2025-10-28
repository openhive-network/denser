import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { validateWifKey } from '@smart-signer/lib/validators/validate-wif-key';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

export enum PasswordFormMode {
  HBAUTH = 'hbauth',
  WIF = 'wif'
}

// Hbauth password (de facto regular password)
const passwordHbauth = z
  .string()
  .min(1, 'Password must contain at least 1 character')
  .max(512, 'Password must contain at most 512 characters');

const passwordFormSchemaHbauth = z.object({
  password: passwordHbauth
});
export type PasswordFormSchemaHbauth = z.infer<typeof passwordFormSchemaHbauth>;

export const passwordFormDefaultValuesHbauth = {
  password: ''
};

// Wif password

export const passwordWif = z.string().superRefine((val, ctx) => {
  const result = validateWifKey(val, (v) => v);
  if (result) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: result,
      fatal: true
    });
    return z.NEVER;
  }
  return true;
});

const passwordFormSchemaWif = z.object({
  password: passwordWif,
  storePassword: z.boolean()
});
export type PasswordFormSchemaWif = z.infer<typeof passwordFormSchemaWif>;

export const passwordFormDefaultValuesWif = {
  password: '',
  storePassword: false
};

// captions for inputs, buttons, form title etc.
export interface PasswordFormI18nKeysForCaptions {
  title?: string;
  description?: string;
  inputPasswordPlaceholder?: string;
  inputStorePasswordLabel?: string;
  submitButtonName?: string;
  submitButtonNameWhenWorking?: string;
  resetButtonName?: string;
}

export interface PasswordFormOptions {
  mode?: PasswordFormMode;
  showInputStorePassword?: boolean;
  errorMessage?: string;
  onSubmit?: (data: PasswordFormSchemaHbauth | PasswordFormSchemaWif) => any;
  i18nKeysForCaptions?: PasswordFormI18nKeysForCaptions;
}

export function PasswordForm({
  mode = PasswordFormMode.HBAUTH,
  showInputStorePassword = true,
  errorMessage = '',
  onSubmit = (data: PasswordFormSchemaHbauth | PasswordFormSchemaWif) => {},
  i18nKeysForCaptions = {} // captions for inputs, buttons, form title etc.
}: PasswordFormOptions) {
  const randomValue = crypto.randomUUID();

  const defaultI18nKeysForCaptions = {
    title: 'Enter your password',
    description: '',
    inputPasswordPlaceholder: 'Password',
    inputStorePasswordLabel: 'Store password',
    submitButtonName: 'Submit',
    submitButtonNameWhenWorking: 'Working…',
    resetButtonName: 'Reset'
  };
  const captionKey: Required<PasswordFormI18nKeysForCaptions> = {
    ...defaultI18nKeysForCaptions,
    ...i18nKeysForCaptions
  };

  let resolver;
  let passwordFormDefaultValues;
  if (mode === PasswordFormMode.HBAUTH) {
    resolver = passwordFormSchemaHbauth;
    passwordFormDefaultValues = passwordFormDefaultValuesHbauth;
  } else if (mode === PasswordFormMode.WIF) {
    resolver = passwordFormSchemaWif;
    passwordFormDefaultValues = passwordFormDefaultValuesWif;
  } else {
    throw new Error('Invalid mode');
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<PasswordFormSchemaHbauth | PasswordFormSchemaWif>({
    resolver: zodResolver(resolver),
    defaultValues: passwordFormDefaultValues
  });

  return (
    <div
      className="flex h-screen flex-col justify-start pt-16 sm:h-fit md:justify-center md:pt-0"
      data-testid="enter-password-to-unlock-key"
    >
      <div className="mx-auto flex w-full max-w-md flex-col items-center">
        <h2 className="w-full text-xl">{captionKey.title}</h2>
        {captionKey.description && <p className="w-full">{captionKey.description}</p>}

        <form method="post" className="mt-6 w-full">
          <div className="relative mb-5">
            <input
              type="password"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-red-500 dark:text-slate-300"
              placeholder={captionKey.inputPasswordPlaceholder}
              autoComplete="current-password"
              {...register('password')}
              data-testid="posting-private-key-input"
            />
            {errors.password?.message && (
              <p className="text-sm text-red-500" role="alert" data-testid="password-form-error-message">
                {errors.password.message}
              </p>
            )}
          </div>

          {showInputStorePassword && (
            <div className="mb-5 flex items-center py-1">
              <input
                id={`store-password-${randomValue}`}
                type="checkbox"
                value=""
                className="h-4 w-4 rounded-lg border border-gray-300 focus:outline-none"
                {...register('storePassword')}
              />
              <label
                htmlFor={`store-password-${randomValue}`}
                className="ml-2 flex items-center text-sm font-medium text-gray-900 dark:text-slate-300"
              >
                {captionKey.inputStorePasswordLabel}
              </label>
            </div>
          )}

          <div className="mt-10 flex items-center justify-between">
            {/* Submit Button */}
            <button
              type="submit"
              className="w-fit rounded-lg bg-red-600 px-5 py-2.5 text-center text-sm font-semibold text-white hover:cursor-pointer hover:bg-red-700 focus:outline-none disabled:bg-gray-400 disabled:hover:cursor-not-allowed"
              onClick={handleSubmit(onSubmit)}
              data-testid="password-submit-button"
              disabled={isSubmitting}
            >
              {!isSubmitting && captionKey.submitButtonName}
              {isSubmitting && captionKey.submitButtonNameWhenWorking}
            </button>

            {/* Reset Button */}
            <button
              type="button"
              onClick={() => reset()}
              className="w-fit rounded-lg bg-transparent px-5 py-2.5 text-center text-sm font-semibold text-gray-500 hover:cursor-pointer hover:text-red-600 focus:outline-none"
              data-testid="password-reset-button"
            >
              {captionKey.resetButtonName}
            </button>
          </div>

          <div>
            <p className="text-sm text-red-500" role="alert">
              {errorMessage || '\u00A0'}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
