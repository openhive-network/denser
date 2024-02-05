import * as z from 'zod';
import { validateHiveAccountName } from '@smart-signer/lib/validate-hive-account-name';
import { LoginTypes, StorageTypes, User } from '@smart-signer/types/common';

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
    storageType: z.nativeEnum(StorageTypes, {
        invalid_type_error: 'Invalid storageType',
        required_error: 'storageType is required',
        invalid_enum_value: 'Please select one of the options from StorageTypes',
    }),
    loginType: z.nativeEnum(LoginTypes, {
        invalid_type_error: 'Invalid loginType',
        required_error: 'loginType is required',
        invalid_enum_value: 'Please select one of the options from LoginTypes',
    }),
    hivesignerToken: z.string({
        required_error: "hivesignerToken is required",
        invalid_type_error: "hivesignerToken must be a string",
    }),
    signatures: z.object({
        memo: z.string(),
        posting: z.string(),
        active: z.string(),
        owner: z.string(),
    })
    .partial(),
    username,
});

export type PostLoginSchema = z.infer<typeof postLoginSchema>;

export type Signatures = PostLoginSchema["signatures"];

export const defaultUser: User = {
    isLoggedIn: false,
    username: '',
    avatarUrl: '',
    loginType: LoginTypes.wif,
    storageType: StorageTypes.localStorage
};
