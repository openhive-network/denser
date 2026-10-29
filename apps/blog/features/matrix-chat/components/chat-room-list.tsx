import clsx from 'clsx';
import { useTranslation } from '@/blog/i18n/client';
import type { ChatRoomView } from '@/blog/features/matrix-chat/lib/chat-view-types';

interface ChatRoomListProps {
  rooms: ChatRoomView[];
  selectedRoomId: string;
  onSelect: (roomId: string) => void;
}

/** The user's joined rooms, one row of buttons, with each room's unread count. */
export function ChatRoomList({ rooms, selectedRoomId, onSelect }: ChatRoomListProps) {
  const { t } = useTranslation('common_blog');
  return (
    <nav aria-label={t('chat_widget.rooms')} className="border-b border-border">
      <ul className="flex gap-1 overflow-x-auto p-1">
        {rooms.map((room) => {
          const selected = room.roomId === selectedRoomId;
          return (
            <li key={room.roomId} className="shrink-0">
              <button
                type="button"
                aria-current={selected ? 'true' : undefined}
                onClick={() => onSelect(room.roomId)}
                className={clsx(
                  'flex max-w-48 items-center gap-1 rounded-md px-2 py-1 text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
                  selected ? 'bg-accent font-semibold text-accent-foreground' : 'text-muted-foreground hover:bg-muted'
                )}
              >
                <span className="truncate">{room.name}</span>
                {room.unread > 0 ? (
                  <span
                    className="rounded-full bg-destructive px-1.5 text-xs font-bold text-white"
                    aria-label={t('chat_widget.unread_count', { number: room.unread })}
                  >
                    {room.unread}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
