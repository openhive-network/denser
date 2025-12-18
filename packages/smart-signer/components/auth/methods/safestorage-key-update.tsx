/* Sign-in with safe storage (use beekeeper wallet through hb-auth) */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AuthUser, AuthorizationError, OnlineClient } from '@hiveio/hb-auth';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { username } from '@smart-signer/lib/auth/utils';
import { hbauthService } from '@smart-signer/lib/hbauth-service';
import { Icons } from '@hive/ui/components/icons';
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
  Checkbox,
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent
} from '@hive/ui';
import Step from '../step';
import { Steps } from '../form';
import { KeyType, LoginType } from '@smart-signer/types/common';

import { validateWifKey } from '@smart-signer/lib/validators/validate-wif-key';
import { KeyAuthorityType } from '@smart-signer/lib/utils';
import { toast } from '@ui/components/hooks/use-toast';
import { logger } from '@ui/lib/logger';

export interface SafeStorageKeyUpdateProps {
  onSetStep: (step: Steps) => void;
  i18nNamespace: string;
  preferredKeyTypes: KeyType[];
  username: string;
  onUsernameChange: (username: string) => void;
}

function getFormSchema() {
  return z
    .object({
      username,
      password: z.string().min(1, {
        message: 'Password is required'
      }),
      wif: z.string().min(1, {
        message: 'Invalid WIF key'
      }),
      keyType: z.nativeEnum(KeyType, {
        invalid_type_error: 'Invalid keyType',
        required_error: 'keyType is required'
      }),
      isStrict: z.boolean().default(false)
    })
    .superRefine((val, ctx) => {
      const result = validateWifKey(val.wif);
      if (result) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: result,
          path: ['wif'],
          fatal: true
        });
        return z.NEVER;
      }
      return true;
    });
}

export type SafeStorageKeyUpdateRef = { cancel: () => Promise<void> };

type SafeStorageKeyUpdateForm = z.infer<ReturnType<typeof getFormSchema>>;

const SafeStorageKeyUpdate = forwardRef<SafeStorageKeyUpdateRef, SafeStorageKeyUpdateProps>(
  ({ onSetStep, preferredKeyTypes, i18nNamespace, username, onUsernameChange }, ref) => {
    useImperativeHandle(ref, () => ({
      async cancel() {
        // No need to cancel anything for key update
      }
    }));

    const authClient = useRef<OnlineClient>();
    const [loading, setLoading] = useState<boolean | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);
    const [registeredUser, setRegisteredUser] = useState<AuthUser | null>(null);
    const [availableKeyTypes, setAvailableKeyTypes] = useState<KeyType[]>([]);
    const [updateSuccess, setUpdateSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const form = useForm<SafeStorageKeyUpdateForm>({
      mode: 'onChange',
      resolver: zodResolver(getFormSchema()),
      defaultValues: {
        username,
        password: '',
        wif: '',
        keyType: preferredKeyTypes[0],
        isStrict: false
      }
    });

    // Check if user exists in hbauth and get available key types
    useEffect(() => {
      (async () => {
        try {
          setLoading(true);
          setError(null);

          // Get the hbauth client
          authClient.current = await hbauthService.getOnlineClient();

          // Check if user exists in hbauth
          const user = await authClient.current.getRegisteredUserByUsername(username);

          if (user) {
            setRegisteredUser(user);

            // Filter preferred key types to only those registered in hbauth
            const availableTypes = preferredKeyTypes.filter((keyType) =>
              user.registeredKeyTypes.includes(keyType as KeyAuthorityType)
            );

            setAvailableKeyTypes(availableTypes.length > 0 ? availableTypes : preferredKeyTypes);

            // Set the first available key type as default
            if (availableTypes.length > 0) {
              form.setValue('keyType', availableTypes[0]);
            }
          } else {
            setError('User not found in safe storage');
          }
        } catch (error) {
          setError((error as AuthorizationError).message);
        } finally {
          setLoading(false);
        }
      })();
    }, [username, preferredKeyTypes, form]);

    // Handle key update
    async function onUpdateKey(values: SafeStorageKeyUpdateForm) {
      const { username, password, wif, keyType, isStrict } = values;
      try {
        setLoading(true);
        setError(null);

        if (!registeredUser) {
          setError('User not found in safe storage');
          return;
        }

        // Try to unlock the wallet with the provided password
        try {
          await authClient.current?.unlock(username, password);
          logger.info('Wallet unlocked successfully for user: %s', username);
        } catch (unlockError) {
          // If unlock fails, we'll continue with the key update process
          logger.warn('Failed to unlock wallet for user: %s, continuing with key update', username);
        }

        // Invalidate the existing key
        await authClient.current?.invalidateExistingKey(username, keyType as KeyAuthorityType);

        // Import the new key
        await authClient.current?.register(username, password, wif, keyType as KeyAuthorityType, isStrict);

        setUpdateSuccess(true);

        toast({
          title: 'Key Updated',
          description: 'Your key has been updated successfully',
          variant: 'success'
        });

        logger.info('Key updated successfully for user: %s, keyType: %s', username, keyType);

        // Reset form after successful update
        form.reset();

        // Go back to previous step after a short delay
        setTimeout(() => {
          onSetStep(Steps.SAFE_STORAGE_LOGIN);
        }, 2000);
      } catch (error) {
        if (typeof error === 'string') {
          setError(error);
        } else {
          setError('Invalid WIF key');
        }
        setLoading(false);
      }
    }

    if (loading === undefined) return <Step loading={true}></Step>;

    return (
      <Step
        title="Update Key in Safe Storage"
        description={
          <div>
            <div data-testid="login-form-description">
              {registeredUser
                ? `Update ${form.getValues().keyType} key for user ${username}`
                : 'User not found in safe storage'}
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
            {updateSuccess && (
              <div className="text-sm text-green-500">
                Key updated successfully! Now you can sign in again.
              </div>
            )}
          </div>
        }
        loading={loading}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onUpdateKey)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={true}
                      placeholder="Enter your username"
                      data-testid="login-form-username"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {availableKeyTypes.length > 1 && (
              <FormField
                control={form.control}
                name="keyType"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                        data-testid="hbauth-update-key-select-key-type"
                      >
                        {availableKeyTypes.map((type) => {
                          return (
                            <FormItem key={type} className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value={type} />
                              </FormControl>
                              <Label className="font-normal capitalize">{type.toLowerCase()}</Label>
                            </FormItem>
                          );
                        })}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type="password"
                        placeholder="Safe storage password"
                        data-testid="login-form-password"
                      />
                      <Button
                        variant="ghost"
                        className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 p-1 hover:bg-transparent"
                        onClick={() => {
                          setShowPassword((prev) => !prev);
                        }}
                      >
                        {showPassword ? <Icons.eyeOff /> : <Icons.eye />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="wif"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder={`WIF ${form.getValues().keyType} private key`}
                      data-testid="login-form-wif"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isStrict"
              render={({ field }) => (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="strict"
                    onCheckedChange={async (isStrict) => {
                      field.onChange(isStrict);
                    }}
                    {...field}
                    checked={field.value}
                    value={field.value as unknown as string}
                  />

                  <label
                    htmlFor="strict"
                    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Direct Authority Mode
                  </label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Icons.info className="h-5 w-5" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        When enabled, the app will only allow adding keys with account's own authority. If you
                        want to add keys with other authority, please disable this mode.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            />

            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => onSetStep(Steps.SAFE_STORAGE_LOGIN)}
                data-testid="login-form-back"
              >
                Back
              </Button>
              <Button type="submit" disabled={loading || updateSuccess} data-testid="login-form-update-key">
                Update Key
              </Button>
            </div>
          </form>
        </Form>
      </Step>
    );
  }
);

SafeStorageKeyUpdate.displayName = 'SafeStorageKeyUpdate';

export default SafeStorageKeyUpdate;
