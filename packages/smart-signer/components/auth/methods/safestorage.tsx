/* Sign-in with safe storage (use beekeeper wallet through hb-auth) */
import { FC, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from "@hookform/resolvers/zod"
import { AuthUser, AuthorizationError, OnlineClient } from "@hive/hb-auth";
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

const formSchema = z.object({
    username: z.string(),
    password: z.string(),
    wif: z.string(),
    keyType: z.enum(['posting', 'active'])
})

export interface SafeStorageProps {
    onSetStep: () => void
}

const SafeStorage: FC<SafeStorageProps> = ({ onSetStep }) => {
    const authClient = useRef<OnlineClient>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
            password: "",
            wif: "",
            keyType: 'posting'
        },
    });

    // 2. Define a submit handler.
    async function onSubmit(values: z.infer<typeof formSchema>) {
        // Do something with the form values.
        // ✅ This will be type-safe and validated.
        const { keyType, password, username, wif } = values;

        authClient.current?.register(username, password, wif, keyType).then((status) => {
            console.log(status)
        }).catch(error => {
            console.log(error)
        })
    }

    useEffect(() => {
        (async () => {
            try {
                // populate authUsers with existing user list
                authClient.current = await hbauthService.getOnlineClient();

                const auths = await authClient.current.getAuths();
                setAuthUsers(auths);
            } catch (err) {
                setError((err as AuthorizationError).message);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const userFound = useMemo(() => {
        return authUsers.filter((user) => user.username === form.getValues().username)[0];
    }, [form.getValues().username]);
    console.log(authUsers);
    // render form fields based on safe storage user status
    if (loading) return <span>loading...</span>

    return (
        <Step title='Sign in with safe storage' description={error && <span className="text-red-600">{error}</span>}>
            {/* Add form here */}
            <Form {...form}>
                {/* 
                Inputs are determined based on user's status

                - If there is no user show:
                    1. username input
                    2. password input
                    3. wif input
                    4. key type
                - If there is any user, fill it in input, with options to select add new this goes to previous step
                    1. username input with options
                    2. password input
                    *& 3. key type
                - If selected one of user from dropdown, write it to input and do previous step

              */}

                {/* Change form name (type) to authenticate  */}
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" name="register">

                    {/* Username */}
                    <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    {/* Place holder, enter username if there is no user, otherwise select user from menu or enter new user*/}
                                    <Input placeholder='Username' type='text' {...field} />
                                    {/* Show select menu if there is length of auth users */}
                                </FormControl>
                                <FormMessage />
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
                    <FormField
                        control={form.control}
                        name="wif"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Input placeholder='WIF Private Key' type='text' {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* WIF */}
                    <FormField
                        control={form.control}
                        name="keyType"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <RadioGroup className='flex mb-8' onValueChange={field.onChange} defaultValue={field.value} {...field}>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="posting" id="r1" />
                                            <Label htmlFor="r1">Posting</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="active" id="r2" />
                                            <Label htmlFor="r2">Active</Label>
                                        </div>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Show this for new user, otherwise show unlock then authorize */}
                    <Button className='w-full' type='submit' disabled={!form.formState.isDirty}>Save and authorize</Button>
                </form>
            </Form>

            <Separator className='my-4' />

            <Button className='w-full' type='button' variant="secondary" onClick={onSetStep}>
                <Icons.keyRound className='mr-2 h-4 w-4' />Other sign in options
            </Button>
        </Step>
    )
}

export default SafeStorage;