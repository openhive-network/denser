'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTopWitnesses } from '@transaction/lib/hive-api';
import { getUserAvatarUrl } from '@hive/ui';
import { cn } from '@ui/lib/utils';
import { useWebRTCGame } from './hooks/use-webrtc-game';

type CellValue = 'player1' | 'player2' | null;
type GameStatus = 'player1' | 'player2' | 'draw' | null;
type GameMode = 'local' | 'online';

interface GameMessage {
  type: 'select_players' | 'move' | 'reset_game' | 'reset_all';
  player1?: string;
  player2?: string;
  cellIndex?: number;
  player?: 'player1' | 'player2';
}

const WINNING_LINES = [
  [0, 1, 2], // top row
  [3, 4, 5], // middle row
  [6, 7, 8], // bottom row
  [0, 3, 6], // left column
  [1, 4, 7], // middle column
  [2, 5, 8], // right column
  [0, 4, 8], // diagonal top-left to bottom-right
  [2, 4, 6] // diagonal top-right to bottom-left
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
  const [gameMode, setGameMode] = useState<GameMode>('local');
  const [player1, setPlayer1] = useState<string | null>(null);
  const [player2, setPlayer2] = useState<string | null>(null);
  const [board, setBoard] = useState<CellValue[]>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<'player1' | 'player2'>('player1');
  const [gameStatus, setGameStatus] = useState<GameStatus>(null);
  const [joinCode, setJoinCode] = useState('');

  const { data: usernames, isLoading, error } = useQuery({
    queryKey: ['topWitnesses'],
    queryFn: async () => await getTopWitnesses(20)
  });

  const handleGameMessage = useCallback((message: GameMessage) => {
    switch (message.type) {
      case 'select_players':
        if (message.player1 !== undefined) setPlayer1(message.player1);
        if (message.player2 !== undefined) setPlayer2(message.player2);
        break;
      case 'move':
        if (message.cellIndex !== undefined && message.player) {
          setBoard((prev) => {
            const newBoard = [...prev];
            newBoard[message.cellIndex!] = message.player!;
            const winner = checkWinner(newBoard);
            if (winner) {
              setGameStatus(winner);
            } else {
              setCurrentPlayer(message.player === 'player1' ? 'player2' : 'player1');
            }
            return newBoard;
          });
        }
        break;
      case 'reset_game':
        setBoard(Array(9).fill(null));
        setCurrentPlayer('player1');
        setGameStatus(null);
        break;
      case 'reset_all':
        setBoard(Array(9).fill(null));
        setCurrentPlayer('player1');
        setGameStatus(null);
        setPlayer1(null);
        setPlayer2(null);
        break;
    }
  }, []);

  const { status, roomCode, isHost, error: connectionError, createRoom, joinRoom, leaveRoom, sendGameMessage } =
    useWebRTCGame({
      onGameMessage: handleGameMessage
    });

  const isOnline = gameMode === 'online';
  const isConnected = status === 'connected';

  // In online mode: host is player1, guest is player2
  const myPlayer = isOnline ? (isHost ? 'player1' : 'player2') : null;
  const isMyTurn = !isOnline || currentPlayer === myPlayer;

  const handleSelectUser = (username: string) => {
    if (gameStatus || board.some((cell) => cell !== null)) {
      return; // Don't allow changing players during game
    }

    // In online mode, only host can select players
    if (isOnline && !isHost) {
      return;
    }

    let newPlayer1 = player1;
    let newPlayer2 = player2;

    if (!player1) {
      newPlayer1 = username;
    } else if (!player2 && username !== player1) {
      newPlayer2 = username;
    } else if (username === player1) {
      newPlayer1 = player2;
      newPlayer2 = null;
    } else if (username === player2) {
      newPlayer2 = null;
    } else {
      newPlayer2 = username;
    }

    setPlayer1(newPlayer1);
    setPlayer2(newPlayer2);

    // Sync to remote player
    if (isOnline && isConnected) {
      sendGameMessage({ type: 'select_players', player1: newPlayer1 ?? undefined, player2: newPlayer2 ?? undefined });
    }
  };

  const handleCellClick = (index: number) => {
    if (!player1 || !player2 || board[index] || gameStatus) {
      return;
    }

    // In online mode, check if it's my turn
    if (isOnline && !isMyTurn) {
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

    // Sync move to remote player
    if (isOnline && isConnected) {
      sendGameMessage({ type: 'move', cellIndex: index, player: currentPlayer });
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer('player1');
    setGameStatus(null);

    if (isOnline && isConnected) {
      sendGameMessage({ type: 'reset_game' });
    }
  };

  const resetAll = () => {
    resetGame();
    setPlayer1(null);
    setPlayer2(null);

    if (isOnline && isConnected) {
      sendGameMessage({ type: 'reset_all' });
    }
  };

  const handleModeChange = (mode: GameMode) => {
    if (mode === gameMode) return;

    // Leave current room if switching away from online
    if (gameMode === 'online' && status !== 'disconnected') {
      leaveRoom();
    }

    // Reset game state
    setBoard(Array(9).fill(null));
    setCurrentPlayer('player1');
    setGameStatus(null);
    setPlayer1(null);
    setPlayer2(null);
    setJoinCode('');
    setGameMode(mode);
  };

  const handleCreateRoom = () => {
    createRoom();
  };

  const handleJoinRoom = () => {
    if (joinCode.length >= 4) {
      joinRoom(joinCode);
    }
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    setBoard(Array(9).fill(null));
    setCurrentPlayer('player1');
    setGameStatus(null);
    setPlayer1(null);
    setPlayer2(null);
  };

  const isSelected = (username: string) => username === player1 || username === player2;
  const gameStarted = board.some((cell) => cell !== null);
  const canPlay = player1 && player2;
  const canSelectPlayers = !isOnline || (isOnline && isHost && isConnected);

  // Connection status display
  const getConnectionStatusText = () => {
    switch (status) {
      case 'connecting':
        return 'Connecting...';
      case 'waiting':
        return 'Waiting for opponent...';
      case 'connected':
        return 'Connected';
      case 'error':
        return connectionError ?? 'Connection error';
      default:
        return 'Disconnected';
    }
  };

  const getConnectionStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'text-green-600';
      case 'waiting':
      case 'connecting':
        return 'text-yellow-600';
      case 'error':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

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
              disabled={!canSelectPlayers}
              className={cn(
                'flex items-center gap-2 rounded-lg border p-2 transition-colors',
                canSelectPlayers && 'hover:bg-muted cursor-pointer',
                !canSelectPlayers && 'opacity-50 cursor-not-allowed',
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
        <h1 className="mb-4 text-2xl font-bold">Tic-Tac-Toe Battle</h1>

        {/* Game mode toggle */}
        <div className="mb-6 flex gap-2 rounded-lg border p-1">
          <button
            onClick={() => handleModeChange('local')}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium transition-colors',
              gameMode === 'local' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            )}
          >
            Local
          </button>
          <button
            onClick={() => handleModeChange('online')}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium transition-colors',
              gameMode === 'online' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            )}
          >
            Online (LAN)
          </button>
        </div>

        {/* Online mode panel */}
        {isOnline && status === 'disconnected' && (
          <div className="mb-6 flex flex-col items-center gap-4 rounded-lg border p-6">
            <p className="text-sm text-muted-foreground">Create a room or join with a code</p>
            <div className="flex gap-4">
              <button
                onClick={handleCreateRoom}
                className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Create Room
              </button>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
                  placeholder="CODE"
                  className="w-20 rounded-lg border px-3 py-2 text-center text-sm font-mono uppercase"
                  maxLength={4}
                />
                <button
                  onClick={handleJoinRoom}
                  disabled={joinCode.length < 4}
                  className={cn(
                    'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                    joinCode.length >= 4 ? 'hover:bg-muted' : 'opacity-50 cursor-not-allowed'
                  )}
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Connection status */}
        {isOnline && status !== 'disconnected' && (
          <div className="mb-6 flex flex-col items-center gap-2 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'h-2 w-2 rounded-full',
                  status === 'connected' && 'bg-green-500',
                  (status === 'waiting' || status === 'connecting') && 'bg-yellow-500 animate-pulse',
                  status === 'error' && 'bg-red-500'
                )}
              />
              <span className={cn('text-sm font-medium', getConnectionStatusColor())}>{getConnectionStatusText()}</span>
            </div>
            {roomCode && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Room Code:</span>
                <span className="font-mono text-lg font-bold tracking-wider">{roomCode}</span>
              </div>
            )}
            {isHost && status === 'waiting' && (
              <p className="text-xs text-muted-foreground">Share this code with your opponent</p>
            )}
            {!isHost && status === 'connected' && (
              <p className="text-xs text-muted-foreground">Waiting for host to select players...</p>
            )}
            <button
              onClick={handleLeaveRoom}
              className="mt-2 rounded border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              Leave Room
            </button>
          </div>
        )}

        {/* Players display */}
        <div className="mb-6 flex items-center gap-8">
          {/* Player 1 (O) - Host in online mode */}
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
                {isOnline && <span className="text-xs text-muted-foreground">(Host)</span>}
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

          {/* Player 2 (X) - Guest in online mode */}
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
                {isOnline && <span className="text-xs text-muted-foreground">(Guest)</span>}
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
            {gameStatus === 'player1' && <span className="text-xl font-bold text-primary">{player1} wins!</span>}
            {gameStatus === 'player2' && <span className="text-xl font-bold text-destructive">{player2} wins!</span>}
            {!gameStatus && !gameStarted && <span className="text-muted-foreground">{player1}&apos;s turn (O)</span>}
            {!gameStatus && gameStarted && (
              <span className="text-muted-foreground">
                {currentPlayer === 'player1' ? `${player1}'s turn (O)` : `${player2}'s turn (X)`}
                {isOnline && (isMyTurn ? ' - Your turn!' : ' - Waiting...')}
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
                disabled={!!cell || !!gameStatus || (isOnline && !isMyTurn)}
                className={cn(
                  'flex h-20 w-20 items-center justify-center rounded-lg border-2 bg-background transition-all',
                  !cell && !gameStatus && isMyTurn && 'hover:bg-muted cursor-pointer',
                  (!isMyTurn || cell || gameStatus) && 'cursor-default',
                  isOnline && !isMyTurn && !cell && !gameStatus && 'opacity-50'
                )}
              >
                {cell === 'player1' && (
                  <img src={getUserAvatarUrl(player1, 'medium')} alt={player1} className="h-14 w-14 rounded-full" />
                )}
                {cell === 'player2' && (
                  <img src={getUserAvatarUrl(player2, 'medium')} alt={player2} className="h-14 w-14 rounded-full" />
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex h-64 w-64 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30">
            <span className="text-center text-muted-foreground">
              {isOnline && !isConnected
                ? 'Connect to play online'
                : isOnline && !isHost
                  ? 'Waiting for host to select players'
                  : 'Select two players to start the game'}
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex gap-4">
          {gameStarted && (
            <button onClick={resetGame} className="rounded-lg border px-4 py-2 text-sm transition-colors hover:bg-muted">
              New Game
            </button>
          )}
          {(player1 || player2) && canSelectPlayers && (
            <button onClick={resetAll} className="rounded-lg border px-4 py-2 text-sm transition-colors hover:bg-muted">
              Change Players
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
