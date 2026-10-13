'use client';

import { Fragment, ReactNode, useCallback, useRef, useState } from 'react';
import { useTranslation } from '@/wallet/i18n/client';
import { Link } from '@hive/ui';
import { Button } from '@ui/components';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@ui/components/dropdown-menu';

export interface BalanceActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus: (event: Event) => void;
}

export interface BalanceAction {
  id: string;
  label: string;
  renderDialog: (props: BalanceActionDialogProps) => ReactNode;
}

interface ActiveDialog {
  id: string;
  open: boolean;
  generation: number;
}

/**
 * A balance button opening a menu of `actions`, each opening its dialog, plus an optional link to
 * the market. The dialogs are rendered outside the menu so every action stays a menu item, and
 * focus goes back to the balance button when a dialog closes.
 */
export function BalanceMenu({
  balance,
  actions,
  withMarket = false
}: {
  balance: string;
  actions: BalanceAction[];
  withMarket?: boolean;
}) {
  const { t } = useTranslation('common_wallet');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [active, setActive] = useState<ActiveDialog | null>(null);
  const activeAction = actions.find((action) => action.id === active?.id);

  // Each opening remounts the dialog so it starts from a clean form; a closed dialog stays mounted
  // until another one opens, which lets a pending broadcast finish and report its result.
  const openDialog = (id: string) =>
    setActive((prev) => ({ id, open: true, generation: (prev?.generation ?? 0) + 1 }));
  const onOpenChange = useCallback(
    (open: boolean) => setActive((prev) => (prev ? { ...prev, open } : prev)),
    []
  );
  const returnFocusToTrigger = useCallback((event: Event) => {
    event.preventDefault();
    triggerRef.current?.focus();
  }, []);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" ref={triggerRef}>
            <div>
              <span className="text-destructive">{balance}</span>
              <span className="m-1 text-xl">▾</span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuGroup>
            {actions.map((action) => (
              <DropdownMenuItem
                key={action.id}
                className="cursor-pointer hover:text-primary"
                onSelect={() => openDialog(action.id)}
              >
                {action.label}
              </DropdownMenuItem>
            ))}
            {withMarket ? (
              <DropdownMenuItem asChild>
                <Link href="/market" className="w-full">
                  {t('profile.market')}
                </Link>
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {active && activeAction ? (
        <Fragment key={active.generation}>
          {activeAction.renderDialog({
            open: active.open,
            onOpenChange,
            onCloseAutoFocus: returnFocusToTrigger
          })}
        </Fragment>
      ) : null}
    </>
  );
}
