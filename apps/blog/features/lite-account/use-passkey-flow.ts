'use client';

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@ui/components/hooks/use-toast';
import { getLogger } from '@ui/lib/logging';
import { useTranslation } from '@/blog/i18n/client';
import { liteAuthorityErrorKey } from './lite-authority-errors';
import { liteAuthorityKey } from './lite-authority-query';
import { openSignerPopup, type SignerPopup } from './signer-client';

const logger = getLogger('app');

/**
 * Runs a passkey flow: `start(popup)` gets the signer popup opened at `origin` (opened here, in the
 * click, or the browser blocks it), then the flow. A failure is logged and toasted with its cause,
 * except a cancelled popup, which changes nothing and says nothing. The account's authority is
 * read again afterwards either way.
 */
export function usePasskeyFlow(name: string | undefined) {
  const { t } = useTranslation('common_blog');
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);

  const fail = useCallback(
    (error: unknown) => {
      const key = liteAuthorityErrorKey(error);
      if (key === null) return;
      logger.error(error, 'Lite passkey flow failed');
      toast({ title: t('lite_account.passkey.failed_title'), description: t(key), variant: 'destructive' });
    },
    [t]
  );

  const run = useCallback(
    async <T>(
      origin: string | null,
      start: (popup: SignerPopup | null) => Promise<T>
    ): Promise<T | undefined> => {
      setPending(true);
      let popup: SignerPopup | null = null;
      try {
        popup = origin ? openSignerPopup(origin) : null;
        return await start(popup);
      } catch (error) {
        fail(error);
        return undefined;
      } finally {
        popup?.close();
        setPending(false);
        if (name) void queryClient.invalidateQueries({ queryKey: liteAuthorityKey(name) });
      }
    },
    [fail, name, queryClient]
  );

  return { run, pending };
}
