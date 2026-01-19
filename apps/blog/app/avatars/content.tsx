'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTopWitnesses } from '@transaction/lib/hive-api';
import { getUserAvatarUrl } from '@hive/ui';
import { cn } from '@ui/lib/utils';

type CellValue = 'player1' | 'player2' | null;
type GameStatus = 'player1' | 'player2' | 'draw' | null;

const WINNING_LINES = [
  [0, 1, 2], // top row
  [3, 4, 5], // middle row
  [6, 7, 8], // bottom row
  [0, 3, 6], // left column
  [1, 4, 7], // middle column
  [2, 5, 8], // right column
  [0, 4, 8], // diagonal top-left to bottom-right
  [2, 4, 6]  // diagonal top-right to bottom-left
];

function checkWinner(board: CellValue[]): GameStatus {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  if (board.every((cell) => cell !== null)) {
    return 'draw';
  }
  return null;
}

export default function AvatarsContent() {
  const [player1, setPlayer1] = useState<string | null>(null);
  const [player2, setPlayer2] = useState<string | null>(null);
  const [board, setBoard] = useState<CellValue[]>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<'player1' | 'player2'>('player1');
  const [gameStatus, setGameStatus] = useState<GameStatus>(null);

  const { data: usernames, isLoading, error } = useQuery({
    queryKey: ['topWitnesses'],
    queryFn: async () => await getTopWitnesses(20)
  });

  const handleSelectUser = (username: string) => {
    if (gameStatus || (board.some((cell) => cell !== null))) {
      return; // Don't allow changing players during game
    }
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

  const handleCellClick = (index: number) => {
    if (!player1 || !player2 || board[index] || gameStatus) {
      return;
    }
    const newBoard = [...board];
    newBoard[index] = currentPlayer;
    setBoard(newBoard);

    const winner = checkWinner(newBoard);
    if (winner) {
      setGameStatus(winner);
    } else {
      setCurrentPlayer(currentPlayer === 'player1' ? 'player2' : 'player1');
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer('player1');
    setGameStatus(null);
  };

  const resetAll = () => {
    resetGame();
    setPlayer1(null);
    setPlayer2(null);
  };

  const isSelected = (username: string) => username === player1 || username === player2;
  const gameStarted = board.some((cell) => cell !== null);
  const canPlay = player1 && player2;

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
        <h1 className="mb-6 text-2xl font-bold">Tic-Tac-Toe Battle</h1>

        {/* Players display */}
        <div className="mb-6 flex items-center gap-8">
          {/* Player 1 (O) */}
          <div
            className={cn(
              'flex flex-col items-center rounded-lg p-3 transition-all',
              currentPlayer === 'player1' && !gameStatus && canPlay && 'bg-primary/10 ring-2 ring-primary'
            )}
          >
            {player1 ? (
              <>
                <img
                  src={getUserAvatarUrl(player1, 'large')}
                  alt={`${player1}'s avatar`}
                  className="h-20 w-20 rounded-full border-4 border-primary shadow-lg"
                />
                <span className="mt-2 text-lg font-bold">{player1}</span>
                <span className="text-2xl font-bold text-primary">O</span>
              </>
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-dashed border-muted-foreground/30">
                <span className="text-center text-xs text-muted-foreground">Player 1</span>
              </div>
            )}
          </div>

          {/* VS */}
          <div className="flex flex-col items-center">
            <span className="text-3xl font-extrabold text-muted-foreground">VS</span>
          </div>

          {/* Player 2 (X) */}
          <div
            className={cn(
              'flex flex-col items-center rounded-lg p-3 transition-all',
              currentPlayer === 'player2' && !gameStatus && canPlay && 'bg-destructive/10 ring-2 ring-destructive'
            )}
          >
            {player2 ? (
              <>
                <img
                  src={getUserAvatarUrl(player2, 'large')}
                  alt={`${player2}'s avatar`}
                  className="h-20 w-20 rounded-full border-4 border-destructive shadow-lg"
                />
                <span className="mt-2 text-lg font-bold">{player2}</span>
                <span className="text-2xl font-bold text-destructive">X</span>
              </>
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-dashed border-muted-foreground/30">
                <span className="text-center text-xs text-muted-foreground">Player 2</span>
              </div>
            )}
          </div>
        </div>

        {/* Game status message */}
        {canPlay && (
          <div className="mb-4 text-center">
            {gameStatus === 'draw' && (
              <span className="text-xl font-bold text-muted-foreground">It&apos;s a draw!</span>
            )}
            {gameStatus === 'player1' && (
              <span className="text-xl font-bold text-primary">🎉 {player1} wins!</span>
            )}
            {gameStatus === 'player2' && (
              <span className="text-xl font-bold text-destructive">🎉 {player2} wins!</span>
            )}
            {!gameStatus && !gameStarted && (
              <span className="text-muted-foreground">{player1}&apos;s turn (O)</span>
            )}
            {!gameStatus && gameStarted && (
              <span className="text-muted-foreground">
                {currentPlayer === 'player1' ? `${player1}'s turn (O)` : `${player2}'s turn (X)`}
              </span>
            )}
          </div>
        )}

        {/* Game board */}
        {canPlay ? (
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3">
            {board.map((cell, index) => (
              <button
                key={index}
                onClick={() => handleCellClick(index)}
                disabled={!!cell || !!gameStatus}
                className={cn(
                  'flex h-20 w-20 items-center justify-center rounded-lg border-2 bg-background transition-all',
                  !cell && !gameStatus && 'hover:bg-muted cursor-pointer',
                  cell && 'cursor-default',
                  gameStatus && 'cursor-default'
                )}
              >
                {cell === 'player1' && (
                  <img
                    src={getUserAvatarUrl(player1, 'medium')}
                    alt={player1}
                    className="h-14 w-14 rounded-full"
                  />
                )}
                {cell === 'player2' && (
                  <img
                    src={getUserAvatarUrl(player2, 'medium')}
                    alt={player2}
                    className="h-14 w-14 rounded-full"
                  />
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex h-64 w-64 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30">
            <span className="text-center text-muted-foreground">
              Select two players
              <br />
              to start the game
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex gap-4">
          {gameStarted && (
            <button
              onClick={resetGame}
              className="rounded-lg border px-4 py-2 text-sm transition-colors hover:bg-muted"
            >
              New Game
            </button>
          )}
          {(player1 || player2) && (
            <button
              onClick={resetAll}
              className="rounded-lg border px-4 py-2 text-sm transition-colors hover:bg-muted"
            >
              Change Players
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
