import * as z from 'zod';
import validateHiveAccountName from './validate-hive-account-name.mjs';

const RE_LOGIN_TYPE = /^(password|hiveauth|hivesigner|keychain)$/;

const postLoginSchemaZod = z.object({
    username: z.string()
        .nonempty('username is required')
        .superRefine((val, ctx) => {
            const result = validateHiveAccountName(val);
            if (result) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: result,
                    fatal: true,
                });
                return z.NEVER;
            }
            return true;
          }),
    signatures: z.object({
        posting: z.string()
    }),
    loginType: z.string()
        .nonempty('loginType is required')
        .regex(RE_LOGIN_TYPE, 'invalid loginType'),
    hivesignerToken: z.string({
        required_error: "hivesignerToken is required",
        invalid_type_error: "hivesignerToken must be a string",
    })
});

const testData = {
    username: 'John',
    signatures: {
        posting: 'sadfagf'
    },
    loginType: 'password',
    hivesignerToken: ''
};

try {
    const dataZod = postLoginSchemaZod.parse(testData);
    console.log('OK');
    console.log('dataZod: %o', dataZod);
} catch (e) {
    if (e instanceof z.ZodError) {
        // console.log('flatten: %o', e.flatten());
        const message = e.issues.map((issue) => JSON.stringify(issue)).join(", ");
        console.log('Error message: %s', message);
    }
    // throw e;
}