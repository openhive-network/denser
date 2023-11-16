import { useUser } from '@/auth/lib/use-user';

export default function Profile() {
  const { user } = useUser({
    redirectTo: '/login',
    redirectIfFound: false,
  });

  return (
    <div className="pt-16 flex flex-col sm:flex-row gap-24 mx-2
        sm:gap-0 sm:justify-around">
      {user && user.username && (
        <div className="flex flex-col gap-3 sm:gap-8 sm:mr-4">
          <h1>Your Hive profile</h1>
          <p>
            You are logged in as user <strong>{user.username}</strong>.
          </p>
        </div>
      )}
    </div>
  )
}
