import { z } from 'zod';

const MIN_PASSWORD_LENGTH = 6;

/**
 * Checks if all characters in the string are identical (e.g., "######", "      ").
 */
function hasAllIdenticalChars(value: string): boolean {
  return value.length > 0 && new Set(value).size === 1;
}

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, {
    message: 'Password length should be at least 6 characters'
  })
  .refine((val) => !hasAllIdenticalChars(val), {
    message: 'Password must not consist of all identical characters'
  });
