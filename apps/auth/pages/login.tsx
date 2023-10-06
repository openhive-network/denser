import { useState } from 'react'
import { LoginForm, LoginFormData } from "@/auth/components/login-form";
import { useUser } from '@/auth/lib/use-user';
import fetchJson, { FetchError } from '@/auth/lib/fetch-json';

export default function LoginPage() {
  // here we just check if user is already logged in and redirect to profile
  const { mutateUser } = useUser({
    redirectTo: '/profile',
    redirectIfFound: true,
  });

  const [errorMsg, setErrorMsg] = useState('');

  const onSubmit = async (data: LoginFormData) => {
    console.log('form data', data);
    const body = { username: data.username };
    try {
      mutateUser(
        await fetchJson('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      )
    } catch (error) {
      if (error instanceof FetchError) {
        setErrorMsg(error.data.message);
      } else {
        console.error('An unexpected error happened:', error);
      }
    }
  };

  return (
    <div className="pt-16 flex flex-col sm:flex-row gap-24 mx-2 sm:gap-0 sm:justify-around">
      <div className="flex flex-col gap-3 sm:gap-8 sm:mr-4">
        <LoginForm
          errorMessage={errorMsg}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
}
