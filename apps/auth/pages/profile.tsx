import { useUser } from '@/auth/lib/use-user';

export default function Profile() {
  const { user } = useUser({
    redirectTo: '/login',
    redirectIfFound: false,
  });

  return (
    <div className="pt-16 flex flex-col sm:flex-row gap-24 mx-2
        sm:gap-0 sm:justify-around">
      <div className="flex flex-col gap-3 sm:gap-8 sm:mr-4">
        <h1>Your Hive profile</h1>
        <h2>
          This page uses{' '}
          <a
            href="https://nextjs.org/docs/basic-features/pages#static-generation-recommended"
            className="keychainify-checked"
          >
            Static Generation (SG)
          </a>{' '}
          and the <a href="/api/user" className="keychainify-checked">/api/user</a> route
        </h2>
        {user && (
          <>
            <p style={{ fontStyle: 'italic' }}>
              Public data from Hive Blockchain
            </p>
            <pre>{JSON.stringify(user, null, 2)}</pre>
          </>
        )}
      </div>
    </div>
  )
}
