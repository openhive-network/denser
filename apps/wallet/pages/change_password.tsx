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
    <div className='flex gap-4 bg-gray-50 p-2 pb-8 dark:bg-slate-950 flex-col max-w-2xl'>
      <div className='text-2xl font-bold'>Change Password</div>
      <Separator />
      <p className='text-sm leading-relaxed text-slate-500'>
        The first rule of Hive is: Do not lose your password.
        <br /> The second rule of Hive is: Do not lose your password. <br /> The
        third rule of Hive is: We cannot recover your password.
        <br /> The fourth rule: If you can remember the password, it is not
        secure. <br />
        The fifth rule: Use only randomly-generated passwords.
        <br /> The sixth rule: Do not tell anyone your password.
        <br /> The seventh rule: Always back up your password.
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
                <FormLabel>ACCOUNT NAME</FormLabel>
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
                  <span>CURRENT PASSWORD</span>{' '}
                  <Link className='text-red-500' href='/recover_account_step_1'>
                    RECOVER ACCOUNT
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
              GENERATED PASSWORD <span className='font-light'>(NEW)</span>
            </div>
            {generatedKey ? (
              <div>
                <code className='block py-2 px-1 my-1 bg-white text-center text-red-500'>
                  {key}
                </code>
                <div className='text-xs font-bold text-center'>
                  BACK IT UP BY STORING IN YOUR PASSWORD MANAGER OR A TEXT FILE
                </div>
              </div>
            ) : (
              <Button
                className='my-1'
                variant='outlineRed'
                onClick={() => handleKey()}
              >
                Click to generate password
              </Button>
            )}
          </div>
          <FormField
            control={form.control}
            name='genereted_password'
            render={({ field }) => (
              <FormItem>
                <FormLabel>RE-ENTER GENERATED PASSWORD</FormLabel>
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
                    I UNDERSTAND THAT HIVE CANNOT RECOVER LOST PASSWORDS{' '}
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
                    I HAVE SECURELY SAVED MY GENERATED PASSWORD
                  </FormLabel>{' '}
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
          <Button type='submit' variant='redHover'>
            Update Password
          </Button>
        </form>
      </Form>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  return {
    props: {
      ...(await serverSideTranslations(req.cookies.NEXT_LOCALE! || i18n.defaultLocale, ['common_wallet']))
    }
  };
};