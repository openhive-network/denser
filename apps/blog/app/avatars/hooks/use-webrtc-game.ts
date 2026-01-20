import { useState, useCallback, useRef, useEffect } from 'react';

type ConnectionStatus = 'disconnected' | 'connecting' | 'waiting' | 'connected' | 'error';

interface GameMessage {
  type: 'select_players' | 'move' | 'reset_game' | 'reset_all';
  player1?: string;
  player2?: string;
  cellIndex?: number;
  player?: 'player1' | 'player2';
}

interface SignalMessage {
  type: 'signal';
  signal: {
    sdp?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
  };
}

interface ServerMessage {
  type: string;
  roomCode?: string;
  playerId?: string;
  signal?: {
    sdp?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
  };
  from?: string;
  message?: string;
}

interface UseWebRTCGameOptions {
  serverUrl?: string;
  onGameMessage?: (message: GameMessage) => void;
  onConnectionChange?: (status: ConnectionStatus) => void;
}

interface UseWebRTCGameReturn {
  status: ConnectionStatus;
  roomCode: string | null;
  isHost: boolean;
  error: string | null;
  createRoom: () => void;
  joinRoom: (code: string) => void;
  leaveRoom: () => void;
  sendGameMessage: (message: GameMessage) => void;
}

const DEFAULT_SERVER_URL = 'ws://localhost:3101';

export function useWebRTCGame(options: UseWebRTCGameOptions = {}): UseWebRTCGameReturn {
  const { serverUrl = DEFAULT_SERVER_URL, onGameMessage, onConnectionChange } = options;

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const isHostRef = useRef(false);

  const updateStatus = useCallback(
    (newStatus: ConnectionStatus) => {
      setStatus(newStatus);
      onConnectionChange?.(newStatus);
    },
    [onConnectionChange]
  );

  const cleanup = useCallback(() => {
    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    pendingCandidatesRef.current = [];
    isHostRef.current = false;
    setRoomCode(null);
    setIsHost(false);
    updateStatus('disconnected');
  }, [updateStatus]);

  const sendSignal = useCallback((signal: SignalMessage['signal']) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'signal', signal }));
    }
  }, []);

  const setupDataChannel = useCallback(
    (channel: RTCDataChannel) => {
      dcRef.current = channel;

      channel.onopen = () => {
        console.log('DataChannel opened');
        updateStatus('connected');
      };

      channel.onclose = () => {
        console.log('DataChannel closed');
        if (status === 'connected') {
          updateStatus('disconnected');
        }
      };

      channel.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as GameMessage;
          onGameMessage?.(message);
        } catch (err) {
          console.error('Failed to parse game message:', err);
        }
      };
    },
    [onGameMessage, status, updateStatus]
  );

  const createPeerConnection = useCallback(
    (asHost: boolean) => {
      // For LAN, we don't need STUN/TURN servers
      const pc = new RTCPeerConnection({
        iceServers: []
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({ candidate: event.candidate.toJSON() });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setError('Connection lost');
          updateStatus('error');
        }
      };

      if (asHost) {
        // Host creates the data channel
        const channel = pc.createDataChannel('game', { ordered: true });
        setupDataChannel(channel);
      } else {
        // Guest receives the data channel
        pc.ondatachannel = (event) => {
          setupDataChannel(event.channel);
        };
      }

      pcRef.current = pc;
      return pc;
    },
    [sendSignal, setupDataChannel, updateStatus]
  );

  const handleSignal = useCallback(
    async (signal: { sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }) => {
      const pc = pcRef.current;
      if (!pc) return;

      try {
        if (signal.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

          // Process any pending ICE candidates
          for (const candidate of pendingCandidatesRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
          pendingCandidatesRef.current = [];

          if (signal.sdp.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendSignal({ sdp: pc.localDescription?.toJSON() });
          }
        } else if (signal.candidate) {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } else {
            // Queue the candidate until we have remote description
            pendingCandidatesRef.current.push(signal.candidate);
          }
        }
      } catch (err) {
        console.error('Signal handling error:', err);
        setError('Connection failed');
        updateStatus('error');
      }
    },
    [sendSignal, updateStatus]
  );

  const connectWebSocket = useCallback((): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(serverUrl);

      ws.onopen = () => {
        wsRef.current = ws;
        resolve(ws);
      };

      ws.onerror = () => {
        reject(new Error('Failed to connect to server'));
      };

      ws.onclose = () => {
        if (wsRef.current === ws) {
          cleanup();
        }
      };

      ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data) as ServerMessage;

          switch (message.type) {
            case 'room_created':
              setRoomCode(message.roomCode ?? null);
              updateStatus('waiting');
              break;

            case 'player_joined':
              if (isHostRef.current && pcRef.current) {
                // Host: create and send offer when guest joins
                console.log('Host creating offer for guest...');
                const offer = await pcRef.current.createOffer();
                await pcRef.current.setLocalDescription(offer);
                sendSignal({ sdp: pcRef.current.localDescription?.toJSON() });
              }
              break;

            case 'signal':
              if (message.signal) {
                await handleSignal(message.signal);
              }
              break;

            case 'player_left':
              setError('Other player left');
              updateStatus('waiting');
              // Reset peer connection for potential reconnect
              if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
              }
              if (isHostRef.current) {
                createPeerConnection(true);
              }
              break;

            case 'room_closed':
              setError('Room was closed');
              cleanup();
              break;

            case 'error':
              setError(message.message ?? 'Unknown error');
              updateStatus('error');
              break;
          }
        } catch (err) {
          console.error('Failed to handle server message:', err);
        }
      };
    });
  }, [serverUrl, cleanup, createPeerConnection, handleSignal, sendSignal, updateStatus]);

  const createRoom = useCallback(async () => {
    try {
      setError(null);
      updateStatus('connecting');

      // Set host flag BEFORE connecting so callback has correct value
      isHostRef.current = true;
      setIsHost(true);

      const ws = await connectWebSocket();

      // Create peer connection first (host creates data channel)
      createPeerConnection(true);

      // Request room creation
      ws.send(JSON.stringify({ type: 'create_room' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
      updateStatus('error');
    }
  }, [connectWebSocket, createPeerConnection, updateStatus]);

  const joinRoom = useCallback(
    async (code: string) => {
      try {
        setError(null);
        updateStatus('connecting');

        // Set host flag BEFORE connecting
        isHostRef.current = false;
        setIsHost(false);

        const ws = await connectWebSocket();
        setRoomCode(code.toUpperCase());

        // Create peer connection (guest receives data channel)
        createPeerConnection(false);

        // Request to join room
        ws.send(JSON.stringify({ type: 'join_room', roomCode: code.toUpperCase() }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to join room');
        updateStatus('error');
      }
    },
    [connectWebSocket, createPeerConnection, updateStatus]
  );

  const leaveRoom = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'leave_room' }));
    }
    cleanup();
  }, [cleanup]);

  const sendGameMessage = useCallback((message: GameMessage) => {
    if (dcRef.current?.readyState === 'open') {
      dcRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    status,
    roomCode,
    isHost,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    sendGameMessage
  };
}
