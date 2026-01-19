'use client';

import { useQuery } from '@tanstack/react-query';
import { getTopWitnesses } from '@transaction/lib/hive-api';
import { getUserAvatarUrl, Link } from '@hive/ui';

export default function AvatarsContent() {
  const { data: usernames, isLoading, error } = useQuery({
    queryKey: ['topWitnesses'],
    queryFn: async () => await getTopWitnesses(20)
  });

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-destructive">Error loading avatars</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-6 text-2xl font-bold">Top 20 Hive Witnesses</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {usernames?.map((username, index) => (
          <Link
            key={username}
            href={`/@${username}`}
            className="flex flex-col items-center rounded-lg border p-4 transition-colors hover:bg-muted"
          >
            <span className="mb-1 text-xs text-muted-foreground">#{index + 1}</span>
            <img
              src={getUserAvatarUrl(username, 'medium')}
              alt={`${username}'s avatar`}
              className="h-16 w-16 rounded-full"
            />
            <span className="mt-2 text-center text-sm font-medium">{username}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
