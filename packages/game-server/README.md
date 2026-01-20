# Tic-Tac-Toe LAN Multiplayer

Gra Tic-Tac-Toe z trybem multiplayer przez sieć lokalną (LAN) używając WebRTC.

## Architektura

```
┌─────────────┐     WebSocket      ┌─────────────────────┐     WebSocket      ┌─────────────┐
│  Gracz 1    │◄──────────────────►│  Serwer Sygnalizac. │◄──────────────────►│  Gracz 2    │
│  (Host)     │                    │  (ws://localhost:3001)                   │  (Guest)    │
└──────┬──────┘                    └─────────────────────┘                    └──────┬──────┘
       │                                                                             │
       │                         WebRTC DataChannel (P2P)                            │
       └─────────────────────────────────────────────────────────────────────────────┘
                                    (stan gry, ruchy)
```

### Komponenty

1. **Serwer sygnalizacyjny** (`packages/game-server/`)
   - WebSocket server na porcie 3001
   - Zarządza pokojami (tworzenie, dołączanie)
   - Generuje 4-znakowe kody pokoi
   - Przekazuje sygnały WebRTC (SDP offer/answer, ICE candidates)
   - NIE przechowuje stanu gry - tylko pomaga ustanowić połączenie P2P

2. **Hook WebRTC** (`apps/blog/app/avatars/hooks/use-webrtc-game.ts`)
   - Łączy się z serwerem sygnalizacyjnym
   - Tworzy połączenie WebRTC (RTCPeerConnection)
   - Otwiera DataChannel do przesyłania danych gry
   - Obsługuje tworzenie/dołączanie do pokoi

3. **UI Gry** (`apps/blog/app/avatars/content.tsx`)
   - Tryb Local (dwóch graczy na jednym urządzeniu)
   - Tryb Online LAN (dwóch graczy przez sieć)
   - Synchronizacja stanu gry przez WebRTC

## Uruchamianie

```bash
# Terminal 1 - Serwer sygnalizacyjny
pnpm --filter @hive/game-server start

# Terminal 2 - Aplikacja blog
pnpm --filter @hive/blog start
```

Gra dostępna pod: http://localhost:3000/avatars

## Przepływ gry online

### 1. Host tworzy pokój
```
Host                    Serwer
  │                        │
  │──create_room──────────►│
  │◄─────room_created──────│ (kod: "RTDB")
  │                        │
```

### 2. Guest dołącza
```
Guest                   Serwer                  Host
  │                        │                      │
  │──join_room("RTDB")────►│                      │
  │                        │──player_joined──────►│
  │◄─────player_joined─────│                      │
  │                        │                      │
```

### 3. Wymiana sygnałów WebRTC
```
Host                    Serwer                  Guest
  │                        │                      │
  │──signal(SDP offer)────►│──signal(SDP offer)──►│
  │◄─signal(SDP answer)────│◄─signal(SDP answer)──│
  │──signal(ICE)──────────►│──signal(ICE)────────►│
  │◄─signal(ICE)───────────│◄─signal(ICE)─────────│
  │                        │                      │
```

### 4. Połączenie P2P ustanowione
```
Host ◄─────────── WebRTC DataChannel ───────────► Guest
         (ruchy, wybór graczy, reset gry)
```

## Wiadomości

### Serwer sygnalizacyjny (WebSocket)

**Klient → Serwer:**
- `{ type: 'create_room' }` - utwórz nowy pokój
- `{ type: 'join_room', roomCode: 'XXXX' }` - dołącz do pokoju
- `{ type: 'signal', signal: {...} }` - przekaż sygnał WebRTC
- `{ type: 'leave_room' }` - opuść pokój

**Serwer → Klient:**
- `{ type: 'room_created', roomCode: 'XXXX' }` - pokój utworzony
- `{ type: 'player_joined', playerId: '...' }` - gracz dołączył
- `{ type: 'player_left', playerId: '...' }` - gracz wyszedł
- `{ type: 'signal', signal: {...}, from: '...' }` - sygnał WebRTC
- `{ type: 'room_closed' }` - pokój zamknięty
- `{ type: 'error', message: '...' }` - błąd

### WebRTC DataChannel (gra P2P)

- `{ type: 'select_players', player1: '...', player2: '...' }` - wybór avatarów
- `{ type: 'move', cellIndex: 0-8, player: 'player1'|'player2' }` - ruch
- `{ type: 'reset_game' }` - nowa gra (zachowaj graczy)
- `{ type: 'reset_all' }` - reset wszystkiego

## Zasady gry online

- **Host** (twórca pokoju) = Player 1 (O)
- **Guest** (dołączający) = Player 2 (X)
- Tylko Host może wybierać avatary świadków
- Każdy gracz może wykonać ruch tylko w swojej turze
- Ruchy są synchronizowane przez WebRTC DataChannel

## Pliki

```
packages/game-server/
├── package.json
├── tsconfig.json
└── src/
    ├── server.ts          # Główny serwer WebSocket
    ├── room-manager.ts    # Zarządzanie pokojami
    └── types.ts           # Typy TypeScript

apps/blog/app/avatars/
├── page.tsx               # Strona SSR
├── content.tsx            # Komponent gry (UI + logika)
└── hooks/
    └── use-webrtc-game.ts # Hook WebRTC
```

## Konfiguracja CSP

W `apps/blog/next.config.js` dodano dozwolone źródła WebSocket:

```javascript
const connectSrcAllowedHosts = new Set([
  // ... inne hosty
  "ws://localhost:3001",
  "wss://localhost:3001"
]);
```

## Rozwiązywanie problemów

### "Failed to connect to server"
- Sprawdź czy game-server działa: `ss -tlnp | grep 3001`
- Uruchom: `pnpm --filter @hive/game-server start`

### CSP blokuje WebSocket
- Sprawdź czy `ws://localhost:3001` jest w `connectSrcAllowedHosts`
- Przebuduj aplikację: `pnpm --filter @hive/blog build`

### Połączenie utknęło na "Connecting..."
- Problem z WebRTC - sprawdź konsolę przeglądarki
- W LAN nie potrzeba STUN/TURN serwerów

### Port zajęty
```bash
# Zwolnij port 3001
lsof -ti:3001 | xargs kill -9

# Zwolnij port 3000
lsof -ti:3000 | xargs kill -9
```
