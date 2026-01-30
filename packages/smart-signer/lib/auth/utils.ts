import * as z from 'zod';
import { validateHiveAccountName } from '@smart-signer/lib/validators/validate-hive-account-name';
import { LoginType, User, KeyType } from '@smart-signer/types/common';
import { TTransactionPackType } from '@hiveio/wax';

export const username = z.string()
    .superRefine((val, ctx) => {
        const result = validateHiveAccountName(val, (v) => v);
        if (result) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: result,
                fatal: true,
            });
        }
    });

export const postLoginSchema = z.object({
    keyType: z.nativeEnum(KeyType, {
        message: 'Invalid keyType',
    }),
    loginType: z.nativeEnum(LoginType, {
        message: 'Invalid loginType',
    }),
    hivesignerToken: z.string({
        message: "hivesignerToken is required",
    }),
    signatures: z.object({
        posting: z.string(),
        active: z.string(),
    }),
    pack: z.nativeEnum(TTransactionPackType),
    strict: z.boolean(),
    txJSON: z.string(),
    authenticateOnBackend: z.boolean(),
    username,
});
export type PostLoginSchema = z.infer<typeof postLoginSchema>;

export const postConsentSchema = z.object({
  oauthClientId: z.string(),
  consent: z.boolean(),
});
export type PostConsentSchema = z.infer<typeof postConsentSchema>;

export type Signatures = PostLoginSchema["signatures"];

export const defaultUser: User = {
    isLoggedIn: false,
    username: '',
    avatarUrl: '',
    loginType: LoginType.Hbauth,
    keyType: KeyType.Posting,
    authenticateOnBackend: true,
    chatAuthToken: '',
    oauthConsent: {},
    strict: false,
};
