'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTopWitnesses } from '@transaction/lib/hive-api';
import { getUserAvatarUrl } from '@hive/ui';
import { cn } from '@ui/lib/utils';

export default function AvatarsContent() {
  const [player1, setPlayer1] = useState<string | null>(null);
  const [player2, setPlayer2] = useState<string | null>(null);

  const { data: usernames, isLoading, error } = useQuery({
    queryKey: ['topWitnesses'],
    queryFn: async () => await getTopWitnesses(20)
  });

  const handleSelectUser = (username: string) => {
    if (!player1) {
      setPlayer1(username);
    } else if (!player2 && username !== player1) {
      setPlayer2(username);
    } else if (username === player1) {
      setPlayer1(player2);
      setPlayer2(null);
    } else if (username === player2) {
      setPlayer2(null);
    } else {
      setPlayer2(username);
    }
  };

  const isSelected = (username: string) => username === player1 || username === player2;

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-destructive">Error loading avatars</div>;
  }

  return (
    <div className="container mx-auto flex gap-8 p-4">
      {/* Left column - user list */}
      <div className="w-48 shrink-0">
        <h2 className="mb-4 text-lg font-bold">Top Witnesses</h2>
        <div className="flex flex-col gap-2">
          {usernames?.map((username, index) => (
            <button
              key={username}
              onClick={() => handleSelectUser(username)}
              className={cn(
                'flex items-center gap-2 rounded-lg border p-2 transition-colors hover:bg-muted',
                isSelected(username) && 'border-primary bg-primary/10'
              )}
            >
              <span className="w-6 text-xs text-muted-foreground">#{index + 1}</span>
              <img
                src={getUserAvatarUrl(username, 'small')}
                alt={`${username}'s avatar`}
                className="h-8 w-8 rounded-full"
              />
              <span className="truncate text-sm font-medium">{username}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Center - versus arena */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <h1 className="mb-8 text-2xl font-bold">Avatar Battle</h1>
        <div className="flex items-center gap-8">
          {/* Player 1 */}
          <div className="flex flex-col items-center">
            {player1 ? (
              <>
                <img
                  src={getUserAvatarUrl(player1, 'large')}
                  alt={`${player1}'s avatar`}
                  className="h-32 w-32 rounded-full border-4 border-primary shadow-lg"
                />
                <span className="mt-4 text-xl font-bold">{player1}</span>
              </>
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-dashed border-muted-foreground/30">
                <span className="text-center text-sm text-muted-foreground">Select player 1</span>
              </div>
            )}
          </div>

          {/* VS */}
          <div className="flex flex-col items-center">
            <span className="text-4xl font-extrabold text-primary">VS</span>
          </div>

          {/* Player 2 */}
          <div className="flex flex-col items-center">
            {player2 ? (
              <>
                <img
                  src={getUserAvatarUrl(player2, 'large')}
                  alt={`${player2}'s avatar`}
                  className="h-32 w-32 rounded-full border-4 border-primary shadow-lg"
                />
                <span className="mt-4 text-xl font-bold">{player2}</span>
              </>
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-dashed border-muted-foreground/30">
                <span className="text-center text-sm text-muted-foreground">Select player 2</span>
              </div>
            )}
          </div>
        </div>

        {/* Reset button */}
        {(player1 || player2) && (
          <button
            onClick={() => {
              setPlayer1(null);
              setPlayer2(null);
            }}
            className="mt-8 rounded-lg border px-4 py-2 text-sm transition-colors hover:bg-muted"
          >
            Reset selection
          </button>
        )}
      </div>
    </div>
  );
}
