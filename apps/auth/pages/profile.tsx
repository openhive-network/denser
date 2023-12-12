import { useState, useEffect } from "react";
import { useUser } from '@/auth/lib/auth/use-user';
import { getLogger } from "@hive/ui/lib/logging";

const logger = getLogger('app');

export default function Profile() {

  const [isClient, setIsClient] = useState(false)
  useEffect(() => {
    setIsClient(true)
  }, [])

  const { user } = useUser({
    redirectTo: '/login',
    redirectIfFound: false,
  });

  return (
    <div className="pt-16 flex flex-col sm:flex-row gap-24 mx-2
        sm:gap-0 sm:justify-around">
      {isClient && user && user.username && (
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
