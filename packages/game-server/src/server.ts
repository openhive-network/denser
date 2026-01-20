import { WebSocketServer, WebSocket } from 'ws';
import { RoomManager } from './room-manager.js';
import type { ClientMessage, ServerMessage } from './types.js';

const PORT = parseInt(process.env.GAME_SERVER_PORT ?? '3101', 10);

const roomManager = new RoomManager();

const wss = new WebSocketServer({ port: PORT });

function send(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function handleMessage(ws: WebSocket, data: string, playerId: string | null): string | null {
  let message: ClientMessage;
  try {
    message = JSON.parse(data) as ClientMessage;
  } catch {
    send(ws, { type: 'error', message: 'Invalid JSON' });
    return playerId;
  }

  switch (message.type) {
    case 'create_room': {
      if (playerId) {
        send(ws, { type: 'error', message: 'Already in a room' });
        return playerId;
      }
      const result = roomManager.createRoom(ws);
      send(ws, { type: 'room_created', roomCode: result.roomCode });
      return result.playerId;
    }

    case 'join_room': {
      if (playerId) {
        send(ws, { type: 'error', message: 'Already in a room' });
        return playerId;
      }
      const result = roomManager.joinRoom(ws, message.roomCode);
      if (!result.success) {
        send(ws, { type: 'error', message: result.error ?? 'Failed to join room' });
        return playerId;
      }
      // Notify host that guest joined
      const room = roomManager.getPlayerRoom(result.playerId!);
      if (room) {
        send(room.host.ws, { type: 'player_joined', playerId: result.playerId! });
      }
      // Notify guest of successful join
      send(ws, { type: 'player_joined', playerId: result.hostId! });
      return result.playerId!;
    }

    case 'signal': {
      if (!playerId) {
        send(ws, { type: 'error', message: 'Not in a room' });
        return playerId;
      }
      const otherPlayer = roomManager.getOtherPlayer(playerId);
      if (otherPlayer) {
        send(otherPlayer.ws, {
          type: 'signal',
          signal: message.signal,
          from: playerId
        });
      }
      return playerId;
    }

    case 'leave_room': {
      if (!playerId) {
        send(ws, { type: 'error', message: 'Not in a room' });
        return playerId;
      }
      const leaveResult = roomManager.leaveRoom(playerId);
      if (leaveResult?.otherPlayer) {
        if (leaveResult.wasHost) {
          send(leaveResult.otherPlayer.ws, { type: 'room_closed' });
        } else {
          send(leaveResult.otherPlayer.ws, { type: 'player_left', playerId });
        }
      }
      return null;
    }

    default:
      send(ws, { type: 'error', message: 'Unknown message type' });
      return playerId;
  }
}

wss.on('connection', (ws) => {
  let playerId: string | null = null;

  console.log('Client connected');

  ws.on('message', (data) => {
    playerId = handleMessage(ws, data.toString(), playerId);
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    if (playerId) {
      const leaveResult = roomManager.leaveRoom(playerId);
      if (leaveResult?.otherPlayer) {
        if (leaveResult.wasHost) {
          send(leaveResult.otherPlayer.ws, { type: 'room_closed' });
        } else {
          send(leaveResult.otherPlayer.ws, { type: 'player_left', playerId });
        }
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

wss.on('listening', () => {
  console.log(`Game signaling server running on ws://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  roomManager.destroy();
  wss.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Log stats every minute
setInterval(() => {
  const stats = roomManager.getStats();
  if (stats.rooms > 0) {
    console.log(`Stats: ${stats.rooms} rooms, ${stats.players} players`);
  }
}, 60000);
