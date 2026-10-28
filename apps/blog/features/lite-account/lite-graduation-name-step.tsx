'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@ui/components/button';
import { DialogFooter } from '@ui/components/dialog';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { useTranslation } from '@/blog/i18n/client';
import {
  checkLiteNameAvailability,
  graduationNameState,
  type LiteNameState
} from './lite-name-availability';
import { createLiteNameChecker } from './lite-name-checker';

/** The Hive account name field: starts on the lite name, checked as the user types (`graduationNameState`). */
function useGraduationNameField(ownName: string) {
  const [name, setName] = useState(ownName);
  const [status, setStatus] = useState<{ name: string; state: LiteNameState }>({ name, state: 'checking' });
  const [checker] = useState(() =>
    createLiteNameChecker(checkLiteNameAvailability, (checked, state) => setStatus({ name: checked, state }), {
      classify: (answer) => graduationNameState(answer, ownName)
    })
  );

  // Runs on mount only: the starting name is this effect's own state.
  useEffect(() => {
    checker.update(name);
    return () => checker.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checker]);

  const edit = (value: string) => {
    setName(value);
    checker.update(value);
  };

  return { name, state: status.name === name ? status.state : 'checking', edit };
}

const NAME_STATE_KEYS: Record<LiteNameState, string> = {
  invalid: 'lite_account.name_dialog.invalid_name',
  checking: 'lite_account.name_dialog.checking',
  available: 'lite_account.name_dialog.available',
  taken: 'lite_account.name_dialog.taken',
  taken_lite: 'lite_account.name_dialog.taken_lite',
  taken_l1: 'lite_account.name_dialog.taken_l1',
  invalid_l1: 'lite_account.name_dialog.invalid_l1',
  check_failed: 'lite_account.name_dialog.check_failed'
};

type Props = {
  ownName: string;
  /** The last attempt's error, by its translation key. */
  error?: string;
  onUpgrade: (account: string) => void;
};

/** Step one: the Hive account's name (the lite name to start with), then Upgrade, which opens the signer. */
export default function LiteGraduationNameStep({ ownName, error, onUpgrade }: Props) {
  const { t } = useTranslation('common_blog');
  const { name, state, edit } = useGraduationNameField(ownName);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (state === 'available') onUpgrade(name);
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="lite-graduation-name">{t('lite_account.graduation.name_label')}</Label>
        <Input
          id="lite-graduation-name"
          value={name}
          autoComplete="off"
          onChange={(event) => edit(event.target.value.trim().toLowerCase())}
          data-testid="lite-graduation-name"
        />
        <p
          className={state === 'available' ? 'text-xs text-muted-foreground' : 'text-xs text-destructive'}
          data-testid="lite-graduation-name-state"
          data-state={state}
        >
          {t(NAME_STATE_KEYS[state])}
        </p>
        <p className="text-xs text-muted-foreground">{t('lite_account.graduation.keys_note')}</p>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert" data-testid="lite-graduation-error">
          {t(error)}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="submit" disabled={state !== 'available'} data-testid="lite-graduation-confirm">
          {t('lite_account.graduation.confirm')}
        </Button>
      </DialogFooter>
    </form>
  );
}
