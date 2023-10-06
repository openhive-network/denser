import { useState } from 'react'
import { LoginForm, LoginFormData } from "@/auth/components/login-form";
import { useSignIn } from "@/auth/lib/auth/useSignIn";

export default function SignInPage() {
  console.log('bamboo at SignInPage');
  const signIn = useSignIn();

  const [errorMsg, setErrorMsg] = useState('')

  const onSubmit = async (data: LoginFormData) => {
    console.log('form data', data);
    const { username: email, password} = data;

    if (typeof email === 'string' && typeof password === 'string') {
      console.log('bamboo onSubmit', email, password);
      signIn({email, password});
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
