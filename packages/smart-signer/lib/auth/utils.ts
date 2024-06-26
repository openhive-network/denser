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
            return z.NEVER;
        }
        return true;
    });

export const postLoginSchema = z.object({
    keyType: z.nativeEnum(KeyType, {
        invalid_type_error: 'Invalid keyType',
        required_error: 'keyType is required',
    }),
    loginType: z.nativeEnum(LoginType, {
        invalid_type_error: 'Invalid loginType',
        required_error: 'loginType is required',
    }),
    hivesignerToken: z.string({
        invalid_type_error: "hivesignerToken must be a string",
        required_error: "hivesignerToken is required",
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

export type Signatures = PostLoginSchema["signatures"];

export const defaultUser: User = {
    isLoggedIn: false,
    username: '',
    avatarUrl: '',
    loginType: LoginType.hbauth,
    keyType: KeyType.posting,
    authenticateOnBackend: true,
    chatAuthToken: '',
    sub: '',
};
