/* Sign-in with safe storage (use beekeeper wallet through hb-auth) */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
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
    FormMessage,
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem
} from "@hive/ui";
import Step from "../step"
import { Steps } from "../form";
import { KeyType, LoginType } from "@smart-signer/types/common";

const formSchema = z.object({
    username,
    password: z.string().min(6, {
        message: "Password length should be more than 6 characters"
    }),
    wif: z.string(),
    keyType: z.nativeEnum(KeyType, {
        invalid_type_error: 'Invalid keyType',
        required_error: 'keyType is required'
    }),
});

export type SafeStorageRef = { cancel: () => Promise<void>; };

export interface SafeStorageProps {
    onSetStep: (step: Steps) => void;
    preferredKeyTypes: KeyType[];
    i18nNamespace: string;
    isSigned?: boolean;
    sign: (loginType: LoginType, username: string, keyType: KeyType) => Promise<void>;
    submit: (username: string) => Promise<void>;
    lastLoggedInUser?: string;
}

type SafeStorageForm = z.infer<typeof formSchema>;

const SafeStorage = forwardRef<SafeStorageRef, SafeStorageProps>(({ onSetStep, sign, submit, preferredKeyTypes, i18nNamespace, isSigned, lastLoggedInUser }, ref) => {
    useImperativeHandle(ref, () => ({
        async cancel() {
            await cancelAuth();
        }
    }))

    const authClient = useRef<OnlineClient>();
    const { t } = useTranslation(i18nNamespace);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState<boolean | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);
    const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);
    const form = useForm<SafeStorageForm>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
            password: "",
            wif: "",
            keyType: preferredKeyTypes[0]
        }
    });

    async function onSave(values: SafeStorageForm) {
        const { username, password, wif, keyType } = values;

        try {
            setLoading(true);
            setError(null);
            await authClient.current?.register(username, password, wif, keyType);
            await finalize(values);
            form.reset();
        } catch (error) {
            setError((error as AuthorizationError).message);
            setLoading(false);
        }
    }

    async function onAuthenticate(values: SafeStorageForm) {
        const { username, password, keyType } = values;
        try {
            setLoading(true);
            setError(null);
            await authClient.current?.authenticate(username, password, keyType);
            await finalize(values);
        } catch (error) {
            setError((error as AuthorizationError).message);
            setLoading(false);
        }
    };

    {/* TODO: Re-work offline flow */ }
    // async function onUnlock({ username, password }: SafeStorageForm) {
    //     try {
    //         setError(null);
    //         await authClient.current?.unlock(username, password);
    //         setAuthUsers(await authClient.current?.getAuths() || []);
    //         form.setValue('password', '');
    //         form.setValue('wif', '');
    //     } catch (error) {
    //         setError((error as AuthorizationError).message);
    //         setLoading(false);
    //     }
    // }

    {/* TODO: Re-work offline flow */ }
    // async function onSign({ username, keyType }: SafeStorageForm): Promise<void> {
    //     await sign(LoginType.hbauth, username, KeyType[keyType]);
    // }

    {/* TODO: Belongs to offline flow */ }
    // async function onSubmitAuth({ username }: SafeStorageForm): Promise<void> {
    //     setLoading(true);
    //     await submit(username);
    //     setLoading(false);
    // }

    async function finalize({ username, keyType }: SafeStorageForm) {
        try {
            setLoading(true);
            await sign(LoginType.hbauth, username, KeyType[keyType]);
            await submit(username);
        } catch (error) {
            setError((error as Error).message);
        } finally {
            setLoading(false);
        }
    }

    async function cancelAuth(): Promise<void> {
        form.reset();
        await authClient?.current?.logout();
        const users = await authClient.current?.getAuths() || [];
        setDefaultUser();
        setAuthUsers(users);
        setLoading(false);
    }

    const setDefaultUser = useCallback(() => {
        if (lastLoggedInUser)
            form.setValue('username', lastLoggedInUser);
    }, [lastLoggedInUser, form])

    useEffect(() => {
        (async () => {
            try {
                // populate authUsers with existing user list
                authClient.current = await hbauthService.getOnlineClient();

                const auths = await authClient.current.getAuths();

                setDefaultUser();

                setAuthUsers(auths);
            } catch (error) {
                setError((error as AuthorizationError).message);
            } finally {
                setLoading(false);
            }
        })();
    }, [setDefaultUser]);

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
        /* eslint-disable react-hooks/exhaustive-deps */
    }, [form.getValues().username, authUsers]);

    if (loading === undefined) return <Step loading={true}></Step>;

    return (
        <Step title={t("login_form.signin_safe_storage.title")} description={<div>
            <div>{description}</div>
            {error && <div className="text-destructive text-sm">{error}</div>}
        </div>} loading={loading}>
            <Form {...form}>
                <form className="space-y-4" name="register" onSubmit={form.handleSubmit(() =>  null)}>
                    {/* Username */}
                    <FormField
                        control={form.control}
                        name="username"
                        render={({ field, formState: { errors } }) => (
                            <FormItem>
                                <FormControl>
                                    {/* Place holder, enter username if there is no user, otherwise select user from menu or enter new user*/}
                                    <div className="flex relative">
                                        <Input placeholder={t("login_form.signin_safe_storage.placeholder_username")} type='text' {...field} />
                                        {authUsers.length ? (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger className="absolute right-0 top-0 p-4">
                                                    <Icons.chevronDown />
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="w-56 absolute -right-7" side="bottom">
                                                    {
                                                        authUsers.map(({ username }) => {
                                                            return (
                                                                <DropdownMenuItem
                                                                    className="cursor-pointer p-2"
                                                                    key={username} onSelect={() => {
                                                                        form.setValue('username', username);
                                                                        form.trigger();
                                                                    }}
                                                                    disabled={form.getValues().username === username}
                                                                >
                                                                    {username}
                                                                </DropdownMenuItem>
                                                            )
                                                        })
                                                    }
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        ) : null}
                                    </div>
                                    {/* Show select menu if there is length of auth users */}
                                </FormControl>
                                {errors.username && <FormMessage className="font-normal">{t(errors.username?.message!)}</FormMessage>}
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
                                    <Input placeholder={t("login_form.signin_safe_storage.placeholder_password")} type='password' {...field} />
                                </FormControl>
                                <FormMessage className="font-normal" />
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
                                    <Input placeholder={t("login_form.signin_safe_storage.placeholder_wif", { keyType: form.getValues().keyType })} type='password' {...field} />
                                </FormControl>
                                <FormMessage className="font-normal" />
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
                                        <FormMessage className="font-normal" />
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
                                            className='w-full flex-1 bg-red-600 hover:bg-red-500 text-white'
                                            type='submit'
                                            disabled={!form.formState.isValid}
                                            onClick={form.handleSubmit(onAuthenticate)}
                                        >
                                            {t("login_form.signin_safe_storage.button_signin")}
                                        </Button>
                                        {/* TODO: Re-work offline flow */}
                                        {/* <Button
                                                    className='w-full flex-1 ml-2'
                                                    type="submit"
                                                    variant={"outline"}
                                                    disabled={!form.formState.isDirty}
                                                    onClick={form.handleSubmit(onUnlock)}
                                                >
                                                    {t("login_form.signin_safe_storage.button_unlock")}
                                                </Button> */}
                                    </>
                                )
                                :
                                <Button
                                    className='w-full flex-1 bg-red-600 hover:bg-red-500 text-white'
                                    type='submit'
                                    disabled={!form.formState.isValid}
                                    onClick={form.handleSubmit(onSave)}
                                >
                                    {t("login_form.signin_safe_storage.button_save")}
                                </Button>
                        }
                    </div>

                    <Separator className='my-4' />

                    <Button className='w-full' type='button' variant="secondary" onClick={() => {
                        cancelAuth();
                        onSetStep(Steps.OTHER_LOGIN_OPTIONS);
                    }}>
                        <Icons.keyRound className='mr-2 h-4 w-4' />{t("login_form.signin_safe_storage.button_other")}
                    </Button>
                </form>


                {/* TODO: Re-work offline flow */}
                {/* (
                        <form onSubmit={form.handleSubmit(onSubmitAuth)}>
                            <p className="mb-4">
                                {t("login_form.signin_safe_storage.description_unlocked_detailed")}
                            </p>

                            <Button className="w-full mb-4" type="submit" disabled={isSigned} onClick={form.handleSubmit(onSign)}>{t("login_form.signin_safe_storage.button_sign_auth")}</Button>

                            <Button className='w-full' type='submit' disabled={form.getFieldState('keyType').invalid || !isSigned}>
                                {t("login_form.signin_safe_storage.button_signin_unlocked")}
                            </Button>
                            <Separator className='my-4' />

                            <Button className='w-full' type='button' variant="secondary" onClick={() => {
                                cancelAuth();
                                onSetStep(Steps.SAFE_STORAGE_LOGIN);
                            }}>
                                {t("login_form.signin_safe_storage.button_cancel")}
                            </Button>
                        </form>
                    ) */}

            </Form>
        </Step >
    )
});

SafeStorage.displayName = 'SafeStorage';

export default SafeStorage;