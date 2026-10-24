import { useTranslation } from '@/blog/i18n/client';

/** One line in place of what the drawer cannot show, pointing to Element for it */
export function ChatPlaceholder({ text, appUrl }: { text: string; appUrl: string }) {
  const { t } = useTranslation('common_blog');
  return (
    <p className="text-sm italic text-muted-foreground" data-testid="chat-placeholder">
      {text}
      {appUrl ? (
        <>
          {' '}
          <a href={appUrl} target="_blank" rel="noopener noreferrer" className="not-italic text-destructive underline">
            {t('chat_widget.open_full_chat')}
          </a>
        </>
      ) : null}
    </p>
  );
}
