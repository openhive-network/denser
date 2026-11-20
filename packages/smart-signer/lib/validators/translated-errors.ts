import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';

/** A smart-signer translation key, as the validators return them (`login_form.zod_error.invalid_wif`). */
const TRANSLATION_KEY = /^[a-z][a-z_]*(\.[a-z][a-z_]*)+$/i;

/**
 * Replaces each field error's message that is a translation key with `translate(key)`, in place; a
 * message that is already text is kept.
 */
export function translateFieldErrors(errors: FieldErrors, translate: (key: string) => string): void {
  for (const error of Object.values(errors)) {
    if (!error || typeof error !== 'object') continue;
    if ('type' in error) {
      // A field's own error; its `ref` is the input element, not more errors
      if (typeof error.message === 'string' && TRANSLATION_KEY.test(error.message)) {
        error.message = translate(error.message);
      }
    } else {
      // An object or array field: the errors of its own fields
      translateFieldErrors(error as FieldErrors, translate);
    }
  }
}

/**
 * `resolver` with its error messages translated: the validators' messages are translation keys
 * (smart-signer's `login_form.zod_error.*`, `chainvalidation_js.*`), shown in the page's language.
 */
export function withTranslatedErrors<T extends FieldValues>(
  resolver: Resolver<T>,
  translate: (key: string) => string
): Resolver<T> {
  return async (values, context, options) => {
    const result = await resolver(values, context, options);
    translateFieldErrors(result.errors, translate);
    return result;
  };
}
