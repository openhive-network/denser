'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/wallet/i18n/client';
import WalletMenu from '@/wallet/components/wallet-menu';
import {
  Button,
  Checkbox,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea
} from '@ui/components';
import { ESupportedLanguages } from '@hiveio/wax';
import { useCreateCommunityMutation } from '@/wallet/components/hooks/use-create-community-mutation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { handleError } from '@ui/lib/handle-error';
import { useQuery } from '@tanstack/react-query';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import Loading from '@ui/components/loading';
import { Link } from '@hive/ui';
import env from '@beam-australia/react-env';
import { getFindAccounts } from '@transaction/lib/hive-api';
import { getAccount } from '@transaction/lib/hive-api';

const getCommmunityName = () => {
  return `hive-${Math.floor(Math.random() * 100000) + 100000}`;
};

const COST_TOKEN = 1;
const COST_HIVE = 3;
// HIVE balances are reported in thousandths
const HIVE_PRECISION = 1000;
const OWNER_ACCOUNT_ID = 'community-owner-account';
const OWNER_ACCOUNT_HINT_ID = 'community-owner-account-hint';
const ADVANCED_FIELDS_ID = 'community-advanced-fields';
const NO_PAYMENT_OPTION_ID = 'community-no-payment-option';

interface CommunitiesPageProps {
  username: string;
  initialCommunityTag: string;
}

export default function CommunitiesPage({ username, initialCommunityTag }: CommunitiesPageProps) {
  const { user } = useUserClient();
  const { data, isPending } = useQuery({
    queryKey: ['findAccounts', username],
    queryFn: async () => await getFindAccounts(user?.username),
    enabled: user.isLoggedIn
  });
  const account = data?.accounts[0];
  const canPayWithHive = Number(account?.balance.amount ?? 0) >= COST_HIVE * HIVE_PRECISION;
  const canPayWithToken = Number(account?.pending_claimed_accounts ?? 0) >= COST_TOKEN;
  const hasPaymentOption = canPayWithHive || canPayWithToken;

  const { t } = useTranslation('common_wallet');
  const [advanced, setAdvanced] = useState(false);
  const createCommunityMutation = useCreateCommunityMutation();
  const [communityTag, setCommunityTag] = useState<string>(initialCommunityTag);

  const generateCommunity = async () => {
    const generatedName = getCommmunityName();
    await (async function generateName() {
      const existentAccount = await getAccount(generatedName);
      if (!!existentAccount) {
        generateName();
      }
    })();
    setCommunityTag(generatedName);
    return;
  };

  useEffect(() => {
    // Only regenerate if the initial tag is already taken
    // This runs client-side after hydration is complete
    const validateAndRegenerate = async () => {
      const existentAccount = await getAccount(communityTag);
      if (existentAccount) {
        await generateCommunity();
      }
    };

    validateAndRegenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const createCommunitySchema = z.object({
    title: z
      .string()
      .min(3, {
        message: t('communities.errors.minimum_characters', {
          value: 3
        })
      })
      .max(20, {
        message: t('communities.errors.maximum_characters', {
          value: 20
        })
      }),
    about: z.string().max(120, {
      message: t('communities.errors.maximum_characters', {
        value: 120
      })
    }),
    lang: z.nativeEnum(ESupportedLanguages),
    nsfw: z.boolean(),
    flagText: z.string(),
    description: z.string(),
    claimed: z
      .enum(['claimed', 'hive'], {
        message: t('communities.errors.pick_one')
      })
      .refine((value) => value === 'claimed' || value === 'hive'),
    saved_password: z.boolean().refine((value) => value === true, {
      message: t('communities.errors.required')
    })
  });
  type CreateCommunityFormValues = z.infer<typeof createCommunitySchema>;

  const form = useForm<CreateCommunityFormValues>({
    resolver: zodResolver(createCommunitySchema),
    mode: 'onSubmit',
    defaultValues: {
      title: '',
      about: '',
      lang: ESupportedLanguages.ENGLISH,
      nsfw: false,
      flagText: '',
      description: '',
      claimed: undefined,
      saved_password: false
    }
  });

  const onSubmit = async (values: CreateCommunityFormValues) => {
    if (account) {
      const { title, about, lang, nsfw, flagText, description, claimed } = values;
      try {
        await createCommunityMutation.mutateAsync({
          memoKey: account?.memo_key,
          communityTag: communityTag,
          title: title,
          about: about,
          flagText: flagText,
          description: description,
          creator: user.username,
          lang: lang,
          nsfw: nsfw,
          claimed: claimed
        });
      } catch (error) {
        handleError(error, {
          method: 'create_community',
          params: {
            title: title,
            about: about,
            creator: username,
            lang: lang,
            nsfw: nsfw,
            flagText: flagText,
            description: description
          }
        });
      }
    }
  };

  return (
    <div className="flex flex-col">
      <WalletMenu username={username} />
      <div className=" mx-auto my-4 flex max-w-2xl flex-col gap-4 p-4">
        {isPending ? (
          <Loading loading={isPending} />
        ) : createCommunityMutation.isPending ? (
          <Loading loading={createCommunityMutation.isPending} />
        ) : createCommunityMutation.isSuccess ? (
          <div className="flex flex-col gap-6">
            <h4 className="text-2xl font-bold">{t('communities.community_created')}</h4>
            <div>
              {t('communities.go_to_community')}
              <Link
                className="text-destructive underline"
                target="_blank"
                href={`${env('BLOG_DOMAIN')}/trending/${communityTag}`}
              >
                {communityTag}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <h4 className="text-2xl font-bold">{t('communities.create_community')}</h4>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('communities.title')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="about"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('communities.about')}</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <Label htmlFor={OWNER_ACCOUNT_ID}>{t('communities.assigned_owner_account')}</Label>
                  <Input
                    id={OWNER_ACCOUNT_ID}
                    value={communityTag}
                    readOnly
                    aria-describedby={OWNER_ACCOUNT_HINT_ID}
                  />
                  <p id={OWNER_ACCOUNT_HINT_ID} className="text-xs">
                    {t('communities.communities_are_built')}
                  </p>
                </div>
                <div id={ADVANCED_FIELDS_ID} className={advanced ? 'flex flex-col gap-4' : 'hidden'}>
                  {advanced ? (
                    <>
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('communities.description')}</FormLabel>
                            <FormControl>
                              <Textarea {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="flagText"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('communities.flag_text')}</FormLabel>
                            <FormControl>
                              <Textarea {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lang"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('communities.lang')}</FormLabel>
                            <Select {...field} onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.entries(ESupportedLanguages).map(([key, value]) => (
                                  <SelectItem key={key} value={value}>
                                    {t(`communities.languages.${value}`)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="nsfw"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center gap-2">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel>{t('communities.nsfw')}</FormLabel>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  ) : null}
                </div>
                <FormField
                  control={form.control}
                  name="claimed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('communities.fee_type')}</FormLabel>
                      <FormMessage />
                      <div className="flex flex-col gap-6">
                        <div className="flex items-center space-x-2">
                          <FormControl>
                            <Input
                              disabled={!canPayWithHive}
                              type="radio"
                              id="hive"
                              value="hive"
                              checked={field.value === 'hive'}
                              onChange={(e) => field.onChange(e.target.value)}
                              className="h-4 w-4"
                            />
                          </FormControl>
                          <Label htmlFor="hive">
                            {t('communities.payment_confirm', {
                              amount: COST_HIVE,
                              owned_hives: Number(account?.balance.amount) / HIVE_PRECISION
                            })}
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <FormControl>
                            <Input
                              disabled={!canPayWithToken}
                              type="radio"
                              id="claimed"
                              value="claimed"
                              checked={field.value === 'claimed'}
                              onChange={(e) => field.onChange(e.target.value)}
                              className="h-4 w-4"
                            />
                          </FormControl>
                          <Label htmlFor="claimed">
                            {t('communities.claim_tokens', {
                              amount: COST_TOKEN,
                              owned_tokens: account?.pending_claimed_accounts ?? 0
                            })}
                          </Label>
                        </div>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="saved_password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel>
                          {t('communities.manage_confirm', {
                            communityName: communityTag,
                            username: user.username
                          })}
                        </FormLabel>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {hasPaymentOption ? null : (
                  <p id={NO_PAYMENT_OPTION_ID} className="text-sm text-destructive">
                    {t('communities.no_payment_option', { hive: COST_HIVE, tokens: COST_TOKEN })}
                  </p>
                )}
                <div className="flex w-full items-center justify-between">
                  <Button
                    type="submit"
                    disabled={!hasPaymentOption}
                    aria-describedby={hasPaymentOption ? undefined : NO_PAYMENT_OPTION_ID}
                  >
                    {t('communities.create_community')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    aria-expanded={advanced}
                    aria-controls={ADVANCED_FIELDS_ID}
                    onClick={() => setAdvanced((prev) => !prev)}
                  >
                    {advanced ? t('communities.basic') : t('communities.advanced')}
                  </Button>
                </div>
              </form>
            </Form>
          </>
        )}
      </div>
    </div>
  );
}
