import { Button } from '@hive/ui/components/button';
import { Input } from '@hive/ui/components/input';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@hive/ui/components/form';
import { useForm } from 'react-hook-form';
import { Checkbox, Separator } from '@hive/ui';
import Link from 'next/link';
import { useState } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { i18n } from '@/wallet/next-i18next.config';
import { useTranslation } from 'next-i18next';

let key = '';
const accountFormSchema = z.object({
  name: z.string().min(2, { message: 'Account name should be longer' }),
  curr_password: z.string().min(2, { message: 'Required' }),
  genereted_password: z.string().refine((value) => value === key, {
    message: 'Passwords do not match'
  }),
  understand: z.boolean().refine((value) => value === true, {
    message: 'Required'
  }),
  saved_password: z.boolean().refine((value) => value === true, {
    message: 'Required'
  })
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

export default function PostForm() {
  const { t } = useTranslation('common_wallet');
  const [generatedKey, setGeneratedKey] = useState(false);
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: '',
      curr_password: '',
      genereted_password: '',
      understand: false,
      saved_password: false
    }
  });
  const newKey = 'afbsdfgayhi4yh4uqhti4hqiuhu';

  function onSubmit(data: AccountFormValues) {
    console.log(JSON.stringify(data, null, 2));
  }

  function handleKey() {
    key = newKey;
    setGeneratedKey(true);
  }

  return (
    <div className='flex gap-4 bg-gray-50 p-2 pb-8 dark:bg-slate-950 flex-col max-w-2xl m-auto'>
      <div className='text-2xl font-bold'>{t('change_password_page.change_password')}</div>
      <Separator />
      <p className='text-sm leading-relaxed text-slate-500'>
      {t('change_password_page.the_rules.one')}<br/>
      {t('change_password_page.the_rules.second')}<br/>
      {t('change_password_page.the_rules.third')}<br/>
      {t('change_password_page.the_rules.fourth')}<br/>
      {t('change_password_page.the_rules.fifth')}<br/>
      {t('change_password_page.the_rules.sixth')}<br/>
      {t('change_password_page.the_rules.seventh')}
      </p>
      <Separator />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className='space-y-8 w-full'
        >
          <FormField
            control={form.control}
            name='name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('change_password_page.account_name')}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='curr_password'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='flex justify-between'>
                  <span>{t('change_password_page.current_password')}</span>{' '}
                  <Link className='text-red-500' href='/recover_account_step_1'>
                    {t('change_password_page.recover_password')}
                  </Link>
                </FormLabel>
                <FormControl>
                  <Input {...field} type='password' />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div>
            <div className='text-sm font-semibold'>
              {t('change_password_page.generated_password')}<span className='font-light'>({t('change_password_page.new')})</span>
            </div>
            {generatedKey ? (
              <div>
                <code className='block py-2 px-1 my-1 bg-white text-center text-red-500'>
                  {key}
                </code>
                <div className='text-xs font-bold text-center'>
                  {t('change_password_page.backup_password_by_storing_it')}
                </div>
              </div>
            ) : (
              <Button
                className='my-1'
                variant='outlineRed'
                onClick={() => handleKey()}
              >
                {t('change_password_page.click_to_generate_password')}
              </Button>
            )}
          </div>
          <FormField
            control={form.control}
            name='genereted_password'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('change_password_page.re_enter_generate_password')}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='understand'
            render={({ field }) => (
              <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className='space-y-1 leading-none'>
                  <FormLabel className='text-xs'>
                  {t('change_password_page.understand_that')}{' '}
                  </FormLabel>{' '}
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />{' '}
          <FormField
            control={form.control}
            name='saved_password'
            render={({ field }) => (
              <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>

                <div className='space-y-1 leading-none'>
                  <FormLabel className='text-xs'>
                    {t('change_password_page.i_saved_password')}
                  </FormLabel>{' '}
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
          <Button type='submit' variant='redHover'>
            {t('change_password_page.update_password')}
          </Button>
        </form>
      </Form>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  return {
    props: {
      ...(await serverSideTranslations(req.cookies.NEXT_LOCALE! || i18n.defaultLocale, ['common_wallet', 'smart-signer']))
    }
  };
};