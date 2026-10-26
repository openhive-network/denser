import { useId, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Button } from '@ui/components/button';
import { Textarea } from '@ui/components/textarea';
import { useTranslation } from '@/blog/i18n/client';

interface ChatComposerProps {
  onSend: (text: string) => void;
}

/** Writes a plain-text message: Enter sends it, Shift+Enter starts a new line. */
export function ChatComposer({ onSend }: ChatComposerProps) {
  const { t } = useTranslation('common_blog');
  const [text, setText] = useState('');
  const inputId = useId();

  const submit = () => {
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    submit();
  };

  return (
    <form className="flex items-end gap-2 border-t border-border p-2" onSubmit={onSubmit}>
      <label htmlFor={inputId} className="sr-only">
        {t('chat_widget.composer_label')}
      </label>
      <Textarea
        id={inputId}
        value={text}
        rows={2}
        // Where focus lands when the chat drawer opens
        data-autofocus
        className="h-auto min-h-0 resize-none"
        placeholder={t('chat_widget.composer_placeholder')}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onKeyDown}
      />
      <Button type="submit" size="sm" disabled={!text.trim()}>
        {t('chat_widget.send')}
      </Button>
    </form>
  );
}
