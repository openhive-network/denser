import type { WebSocket } from 'ws';
import type { Room, Player } from './types.js';

const ROOM_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars: I, O, 0, 1
const CODE_LENGTH = 4;

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private playerToRoom: Map<string, string> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanupStaleRooms(), 60000);
  }

  private generateCode(): string {
    let code: string;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      code = '';
      for (let i = 0; i < CODE_LENGTH; i++) {
        code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
      }
      attempts++;
    } while (this.rooms.has(code) && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error('Could not generate unique room code');
    }

    return code;
  }

  private generatePlayerId(): string {
    return `player_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  createRoom(ws: WebSocket): { roomCode: string; playerId: string } {
    const roomCode = this.generateCode();
    const playerId = this.generatePlayerId();

    const host: Player = {
      id: playerId,
      ws,
      isHost: true
    };

    const room: Room = {
      code: roomCode,
      host,
      guest: null,
      createdAt: Date.now()
    };

    this.rooms.set(roomCode, room);
    this.playerToRoom.set(playerId, roomCode);

    console.log(`Room created: ${roomCode} by ${playerId}`);
    return { roomCode, playerId };
  }

  joinRoom(ws: WebSocket, roomCode: string): { success: boolean; playerId?: string; hostId?: string; error?: string } {
    const room = this.rooms.get(roomCode.toUpperCase());

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.guest) {
      return { success: false, error: 'Room is full' };
    }

    const playerId = this.generatePlayerId();

    const guest: Player = {
      id: playerId,
      ws,
      isHost: false
    };

    room.guest = guest;
    this.playerToRoom.set(playerId, roomCode.toUpperCase());

    console.log(`Player ${playerId} joined room ${roomCode}`);
    return { success: true, playerId, hostId: room.host.id };
  }

  leaveRoom(playerId: string): { roomCode: string; wasHost: boolean; otherPlayer: Player | null } | null {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return null;

    const room = this.rooms.get(roomCode);
    if (!room) return null;

    this.playerToRoom.delete(playerId);

    const wasHost = room.host.id === playerId;
    let otherPlayer: Player | null = null;

    if (wasHost) {
      // Host left - close the room
      otherPlayer = room.guest;
      if (room.guest) {
        this.playerToRoom.delete(room.guest.id);
      }
      this.rooms.delete(roomCode);
      console.log(`Room ${roomCode} closed (host left)`);
    } else {
      // Guest left
      otherPlayer = room.host;
      room.guest = null;
      console.log(`Guest left room ${roomCode}`);
    }

    return { roomCode, wasHost, otherPlayer };
  }

  getOtherPlayer(playerId: string): Player | null {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return null;

    const room = this.rooms.get(roomCode);
    if (!room) return null;

    if (room.host.id === playerId) {
      return room.guest;
    }
    return room.host;
  }

  getPlayerRoom(playerId: string): Room | null {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return null;
    return this.rooms.get(roomCode) ?? null;
  }

  findPlayerByWs(ws: WebSocket): string | null {
    for (const [roomCode, room] of this.rooms) {
      if (room.host.ws === ws) return room.host.id;
      if (room.guest?.ws === ws) return room.guest.id;
    }
    return null;
  }

  private cleanupStaleRooms(): void {
    const now = Date.now();
    const staleCodes: string[] = [];

    for (const [code, room] of this.rooms) {
      if (now - room.createdAt > ROOM_TIMEOUT_MS) {
        staleCodes.push(code);
      }
    }

    for (const code of staleCodes) {
      const room = this.rooms.get(code);
      if (room) {
        // Notify players
        const closeMessage = JSON.stringify({ type: 'room_closed' });
        try {
          room.host.ws.send(closeMessage);
        } catch {
          // Ignore send errors
        }
        if (room.guest) {
          try {
            room.guest.ws.send(closeMessage);
          } catch {
            // Ignore send errors
          }
          this.playerToRoom.delete(room.guest.id);
        }
        this.playerToRoom.delete(room.host.id);
        this.rooms.delete(code);
        console.log(`Room ${code} closed (timeout)`);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.rooms.clear();
    this.playerToRoom.clear();
  }

  getStats(): { rooms: number; players: number } {
    return {
      rooms: this.rooms.size,
      players: this.playerToRoom.size
    };
  }
}
