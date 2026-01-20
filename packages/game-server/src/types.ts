import type { WebSocket } from 'ws';

// Client -> Server messages
export interface CreateRoomMessage {
  type: 'create_room';
}

export interface JoinRoomMessage {
  type: 'join_room';
  roomCode: string;
}

export interface SignalMessage {
  type: 'signal';
  signal: RTCSignalData;
}

export interface LeaveRoomMessage {
  type: 'leave_room';
}

export type ClientMessage = CreateRoomMessage | JoinRoomMessage | SignalMessage | LeaveRoomMessage;

// Server -> Client messages
export interface RoomCreatedMessage {
  type: 'room_created';
  roomCode: string;
}

export interface PlayerJoinedMessage {
  type: 'player_joined';
  playerId: string;
}

export interface PlayerLeftMessage {
  type: 'player_left';
  playerId: string;
}

export interface SignalResponseMessage {
  type: 'signal';
  signal: RTCSignalData;
  from: string;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export interface RoomClosedMessage {
  type: 'room_closed';
}

export type ServerMessage =
  | RoomCreatedMessage
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | SignalResponseMessage
  | ErrorMessage
  | RoomClosedMessage;

// WebRTC signal data (SDP or ICE candidate)
export interface RTCSignalData {
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

// Room and player management
export interface Player {
  id: string;
  ws: WebSocket;
  isHost: boolean;
}

export interface Room {
  code: string;
  host: Player;
  guest: Player | null;
  createdAt: number;
}
