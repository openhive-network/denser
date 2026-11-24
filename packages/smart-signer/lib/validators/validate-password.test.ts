import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_PASSWORD_LENGTH, newPasswordSchema, passwordSchema } from './validate-password.ts';

const messageOf = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? null : result.error?.issues[0]?.message;

const longPassword = (length: number) => 'ab'.repeat(length).slice(0, length);

describe('newPasswordSchema', () => {
  it(`takes a password of ${MAX_PASSWORD_LENGTH} characters`, () => {
    assert.equal(messageOf(newPasswordSchema.safeParse(longPassword(MAX_PASSWORD_LENGTH))), null);
  });

  it('refuses a longer password with the translated too-long message', () => {
    assert.equal(
      messageOf(newPasswordSchema.safeParse(longPassword(MAX_PASSWORD_LENGTH + 1))),
      'login_form.zod_error.password_too_long'
    );
  });

  it('keeps the minimum length and the repeated-character rule', () => {
    assert.equal(messageOf(newPasswordSchema.safeParse('abc')), 'login_form.zod_error.password_length');
    assert.equal(
      messageOf(newPasswordSchema.safeParse('aaaaaaa')),
      'login_form.zod_error.password_identical_characters'
    );
  });
});

describe('passwordSchema', () => {
  it("takes an existing wallet's password longer than the new-password maximum", () => {
    assert.equal(messageOf(passwordSchema.safeParse(longPassword(1140))), null);
  });
});
