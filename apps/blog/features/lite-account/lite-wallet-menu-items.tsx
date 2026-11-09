'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DropdownMenuItem, DropdownMenuLabel } from '@ui/components/dropdown-menu';
import { Icons } from '@ui/components/icons';
import { getLogger } from '@ui/lib/logging';
import { useTranslation } from '@/blog/i18n/client';
import type { StoredLiteIdentity } from './lite-identity-record';
import { isWalletUnlocked, liteWalletUsername } from './lite-wallet';
import { liteWalletClient } from './lite-wallet-browser';

const logger = getLogger('app');

const walletStateKey = (identity: StoredLiteIdentity) => ['liteWalletUnlocked', liteWalletUsername(identity)];

/**
 * The identity menu's Safe Storage lines, mounted with the open menu of an identity whose keys are
 * in Safe Storage (hb-auth's worker loads with it): whether its entry is locked, and Lock while it is
 * not. Lock ends the entry's session only (hb-auth's `logout`; its `lock` would lock every account of
 * the worker), so the next lite action asks to unlock it.
 */
export default function LiteWalletMenuItems({ identity }: { identity: StoredLiteIdentity }) {
  const { t } = useTranslation('common_blog');
  const queryClient = useQueryClient();
  const queryKey = walletStateKey(identity);
  const state = useQuery({
    queryKey,
    queryFn: async () => isWalletUnlocked(identity, await liteWalletClient()),
    staleTime: 0
  });
  const lock = useMutation({
    mutationFn: async () => (await liteWalletClient()).logout(liteWalletUsername(identity)),
    onError: (error: unknown) => logger.error(error, 'Could not lock the lite account in Safe Storage'),
    onSettled: () => queryClient.invalidateQueries({ queryKey })
  });

  if (state.data === undefined) return null;
  const unlocked = state.data;

  return (
    <>
      <DropdownMenuLabel
        className="flex items-center text-xs font-normal text-muted-foreground"
        data-testid="lite-wallet-state"
        data-unlocked={unlocked}
      >
        <Icons.lock className="mr-2 h-4 w-4" />
        {unlocked ? t('lite_account.safe_storage.unlocked') : t('lite_account.safe_storage.locked')}
      </DropdownMenuLabel>
      {unlocked ? (
        <DropdownMenuItem
          className="cursor-pointer"
          disabled={lock.isPending}
          onSelect={() => lock.mutate()}
          data-testid="lite-wallet-lock"
        >
          <Icons.lock className="mr-2" />
          <span className="w-full">{t('lite_account.safe_storage.lock')}</span>
        </DropdownMenuItem>
      ) : null}
    </>
  );
}
