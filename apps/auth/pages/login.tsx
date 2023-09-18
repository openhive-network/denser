import { useState } from 'react'
import LoginForm from "@/auth/components/login-form";
import useUser from '@/auth/lib/use-user';


export default function LoginPage() {
  // here we just check if user is already logged in and redirect to profile
  const { mutateUser } = useUser({
    redirectTo: '/profile-sg',
    redirectIfFound: true,
  })

  const [errorMsg, setErrorMsg] = useState('')

  return (
    <div className="pt-16 flex flex-col sm:flex-row gap-24 mx-2 sm:gap-0 sm:justify-around">
      <div className="flex flex-col gap-3 sm:gap-8 sm:mr-4">
        <LoginForm
          errorMessage={errorMsg}
          mutateUser={mutateUser}
        />
      </div>
    </div>
  );
}
