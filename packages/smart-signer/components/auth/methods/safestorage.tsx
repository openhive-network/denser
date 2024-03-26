/* Sign-in with safe storage (use beekeeper wallet through hb-auth) */
import { FC, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from 'react-hook-form';
import { useTranslation } from 'next-i18next';
import { AuthUser, AuthorizationError, KeyAuthorityType, OnlineClient } from "@hive/hb-auth";
import { z } from 'zod';
import { zodResolver } from "@hookform/resolvers/zod";
import { username } from '@smart-signer/lib/auth/utils';
import { hbauthService } from "@smart-signer/lib/hbauth-service";
import { Icons } from "@hive/ui/components/icons";
import {
    Input,
    RadioGroup,
    RadioGroupItem,
    Label,
    Button,
    Separator,
    Form,
    FormField,
    FormItem,
    FormControl,
    FormMessage
} from "@hive/ui";
import Step from "../step"
import { ProcessAuthFn, Steps } from "../form";
import { KeyType, LoginType } from "@smart-signer/types/common";

const formSchema = z.object({
    username,
    password: z.string(),
    wif: z.string(),
    keyType: z.enum(['posting', 'active'])
})

export interface SafeStorageProps {
    onSetStep: (step: Steps) => void;
    onProcessAuth: ProcessAuthFn;
    preferredKeyTypes: KeyAuthorityType[];
    i18nNamespace: string
}

type SafeStorageForm = z.infer<typeof formSchema>;

const SafeStorage: FC<SafeStorageProps> = ({ onSetStep, onProcessAuth, preferredKeyTypes, i18nNamespace }) => {
    const authClient = useRef<OnlineClient>();
    const { t } = useTranslation(i18nNamespace);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);
    const form = useForm<SafeStorageForm>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
            password: "",
            wif: "",
            keyType: preferredKeyTypes[0]
        },
    });

    async function onSubmit(values: SafeStorageForm) {
        // no use currently
    }

    async function onSave(values: SafeStorageForm) {
        const { username, password, wif, keyType } = values;

        try {
            setLoading(true);
            await authClient.current?.register(username, password, wif, keyType);
            await finalize(values);
            form.reset();
        } catch (error) {
            setError(t('')) // todo: set error
        }
    }

    async function onAuthenticate(values: SafeStorageForm) {
        const { username, password, keyType } = values;
        try {
            setLoading(true);
            await authClient.current?.authenticate(username, password, keyType);
            // authorize by signing challenge here
            // complete process, close modal.
            await finalize(values);
        } catch (error) {
            setError(t('')) // todo: set error
        }
    };

    async function onUnlock({ username, password }: SafeStorageForm) {
        try {
            await authClient.current?.unlock(username, password);
            setAuthUsers(await authClient.current?.getAuths() || []);
            form.setValue('password', '');
            form.setValue('wif', '');
        } catch (error) {
            setError(t('')) // todo: set error
        }
    }

    async function finalize({ username, keyType }: SafeStorageForm) {
        try {
            setLoading(true);
            await onProcessAuth(LoginType.hbauth, username, KeyType[keyType]);
        } catch (error) {
            setError(t('')) // todo: set error
        } finally {
            setLoading(false);
        }
    }

    async function cancelAuth(): Promise<void> {
        form.reset();
        await authClient?.current?.logout();
        const users = await authClient.current?.getAuths() || [];
        setDefaultUser(users);
        setAuthUsers(users);
        setDescription('Your keys are not exposed to network');
        setLoading(false);
    }

    function setDefaultUser(auths: AuthUser[]) {
        // pre-set existing user, for now it is first in the list
        if (auths.length)
            form.setValue('username', auths[0].username);
    }

    useEffect(() => {
        (async () => {
            try {
                // populate authUsers with existing user list
                authClient.current = await hbauthService.getOnlineClient();

                const auths = await authClient.current.getAuths();

                // pre-set existing user, for now it is first in the list
                setDefaultUser(auths);

                setAuthUsers(auths);
            } catch (err) {
                setError((err as AuthorizationError).message);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const userFound = useMemo(() => {
        const found = authUsers.filter((user) => user.username === form.getValues().username)[0];

        if (found?.username) {
            if (found?.unlocked) {
                setDescription(t("login_form.signin_safe_storage.description_unlocked", { keyType: form.getValues().keyType }));
            } else {
                setDescription(t("login_form.signin_safe_storage.description_unlock"));
            }
        } else {
            setDescription(t("login_form.signin_safe_storage.description_save", { keyType: form.getValues().keyType }));
        }

        return found;
    }, [form.getValues().username, authUsers]);

    return (
        <Step title={t("login_form.signin_safe_storage.title")} description={description} loading={loading}>
            <Form {...form}>
                {!userFound?.unlocked ?
                    (
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" name="register">
                            {/* Username */}
                            <FormField
                                control={form.control}
                                name="username"
                                render={({ field, formState: { errors } }) => (
                                    <FormItem>
                                        <FormControl>
                                            {/* Place holder, enter username if there is no user, otherwise select user from menu or enter new user*/}
                                            <Input placeholder='Username' type='text' {...field} />
                                            {/* Show select menu if there is length of auth users */}
                                        </FormControl>
                                        {errors.username && <FormMessage>{t(errors.username?.message!)}</FormMessage>}
                                    </FormItem>
                                )}
                            />

                            {/* Password */}
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input placeholder='Password' type='password' {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* WIF */}
                            {!userFound && <FormField
                                control={form.control}
                                name="wif"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input placeholder={`${`WIF ${form.getValues().keyType} private key`}`} type='text' {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />}

                            {/* Key Type selection is shown if there is more than one preferred key type */}
                            {
                                preferredKeyTypes.length > 1 && (
                                    <FormField
                                        control={form.control}
                                        name="keyType"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <RadioGroup className='flex mb-8' onValueChange={field.onChange} defaultValue={field.value} {...field}>
                                                        {
                                                            preferredKeyTypes.map((type) => {
                                                                return <div key={type} className="flex items-center space-x-2">
                                                                    <RadioGroupItem value={type} id={type} />
                                                                    <Label htmlFor={type} className="capitalize">{type}</Label>
                                                                </div>
                                                            })
                                                        }
                                                    </RadioGroup>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )
                            }

                            {/* Show this for new user, otherwise show unlock then authorize */}
                            <div className="flex">
                                {
                                    userFound
                                        ?
                                        (
                                            <>
                                                <Button
                                                    className='w-full flex-1'
                                                    type='submit'
                                                    disabled={!form.formState.isDirty}
                                                    onClick={form.handleSubmit(onAuthenticate)}
                                                >
                                                    Sign in
                                                </Button>
                                                <Button
                                                    className='w-full flex-1 ml-2'
                                                    type="submit"
                                                    variant={"outline"}
                                                    disabled={!form.formState.isDirty}
                                                    onClick={form.handleSubmit(onUnlock)}
                                                >
                                                    Unlock Offline
                                                </Button></>
                                        )
                                        :
                                        <Button
                                            className='w-full flex-1'
                                            type='submit'
                                            disabled={!form.formState.isDirty}
                                            onClick={form.handleSubmit(onSave)}
                                        >
                                            Save and sign in
                                        </Button>
                                }
                            </div>


                            <Separator className='my-4' />

                            <Button className='w-full' type='button' variant="secondary" onClick={() => {
                                cancelAuth();
                                onSetStep(Steps.OTHER_LOGIN_OPTIONS);
                            }}>
                                <Icons.keyRound className='mr-2 h-4 w-4' />Other sign in options
                            </Button>
                        </form>
                    )
                    :
                    (
                        // update description here
                        // Say, select key type to authoirze
                        // add button, authorize 
                        <form onSubmit={form.handleSubmit(finalize)}>
                            <p className="mb-4">
                                Your authorization tx is signed offline. Now you can continue authorization.
                            </p>

                            <Button className='w-full' type='submit' disabled={form.getFieldState('keyType').invalid}>Authorize</Button>
                            <Separator className='my-4' />

                            <Button className='w-full' type='button' variant="secondary" onClick={() => {
                                cancelAuth();
                                onSetStep(Steps.SAFE_STORAGE_LOGIN);
                            }}>
                                Cancel
                            </Button>
                        </form>
                    )
                }
            </Form>
        </Step >
    )
}

export default SafeStorage;