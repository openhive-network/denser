import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Separator } from "@hive/ui/components/separator";
import { getLogger } from "@hive/ui/lib/logging";
import { Input } from '@hive/ui/components/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage
} from '@hive/ui/components/form';

const loginFormSchema = z.object({
  username: z.string().min(1, { message: '' }),
  password: z.string().min(1, { message: '' }),
  // useHiveAuth: z.boolean(),
  // remember: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

function LoginForm() {
  const logger = getLogger('app');
  logger.info('Starting LoginForm');

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: '',
      password: '',
      // useHiveAuth: false,
      // remember: false,
    },
  });
  function onSubmit(data: LoginFormValues) {
    console.log(JSON.stringify(data, null, 2));
  }

  return (
    <div className="flex h-screen flex-col justify-start pt-16 sm:h-fit md:justify-center md:pt-0">
      <div className="mx-auto flex w-[440px] max-w-md flex-col items-center">
        <h2 className="w-full pb-6 text-3xl text-gray-800">
          Login
        </h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="Username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="Password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

          </form>
        </Form>
      </div>
    </div>
  );
}

export default LoginForm;
