import * as z from 'zod';
import { validateHiveAccountName } from '@/auth/lib/validate-hive-account-name';

export enum LoginTypes {
    password = 'password',
    hiveauth = 'hiveauth',
    hivesigner = 'hivesigner',
    keychain = 'keychain',
}

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
    loginType: z.nativeEnum(LoginTypes),
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
