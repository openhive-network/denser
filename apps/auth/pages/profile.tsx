'use client'

import { useUser } from '@/auth/lib/use-user';

// Make sure to check https://nextjs.org/docs/basic-features/layouts for more info on how to use layouts
export default function Profile() {
  const { user } = useUser({
    redirectTo: '/signin',
  })

  return (
    <div className="pt-16 flex flex-col sm:flex-row gap-24 mx-2 sm:gap-0 sm:justify-around">
      <div className="flex flex-col gap-3 sm:gap-8 sm:mr-4">
        <h1>Your GitHub profile</h1>
        <h2>
          This page uses{' '}
          <a href="https://nextjs.org/docs/basic-features/pages#static-generation-recommended">
            Static Generation (SG)
          </a>{' '}
          and the <a href="/api/user">/api/user</a> route
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
