import { z } from 'zod';

const MIN_PASSWORD_LENGTH = 6;

/**
 * The longest safe storage password a user may choose. Beekeeper takes any length, so only a new
 * password is held to it: a wallet whose password is longer still unlocks.
 */
export const MAX_PASSWORD_LENGTH = 512;

/**
 * Checks if all characters in the string are identical (e.g., "######", "      ").
 */
function hasAllIdenticalChars(value: string): boolean {
  return value.length > 0 && new Set(value).size === 1;
}

const passwordLength = z.string().min(MIN_PASSWORD_LENGTH, {
  message: 'login_form.zod_error.password_length'
});

function withDistinctChars(schema: z.ZodString) {
  return schema.refine((val) => !hasAllIdenticalChars(val), {
    message: 'login_form.zod_error.password_identical_characters'
  });
}

/** The password of an existing safe storage wallet: no maximum, which only a new password has */
export const passwordSchema = withDistinctChars(passwordLength);

/** A password chosen for a new safe storage wallet */
export const newPasswordSchema = withDistinctChars(
  passwordLength.max(MAX_PASSWORD_LENGTH, { message: 'login_form.zod_error.password_too_long' })
);
