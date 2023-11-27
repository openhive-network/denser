import { useUser } from '../../components/hooks/use-user';

export default function Profile() {
  const { user } = useUser({
    redirectTo: '/trending',
    redirectIfFound: false
  });

  return (
    <div
      className="mx-2 flex flex-col gap-24 pt-16 sm:flex-row
        sm:justify-around sm:gap-0"
    >
      {user && user.username && (
        <div className="flex flex-col gap-3 sm:mr-4 sm:gap-8">
          <h1>Your Hive profile</h1>
          <p>
            You are logged in as user <strong>{user.username}</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
