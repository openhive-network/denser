'use client';

import { useState } from 'react';
import { generateLiteName, isValidLiteName } from '@hiveio/lite-account';
import { Button } from '@ui/components/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ui/components/dialog';
import { Input } from '@ui/components/input';
import { useTranslation } from '@/blog/i18n/client';

type Props = { open: boolean; onOpenChange: (open: boolean) => void; onConfirm: (name: string) => void };

/** First-reply name prompt: a suggested adjective-noun-number handle, overridable (design doc §2 step 3). */
export default function LiteNameDialog({ open, onOpenChange, onConfirm }: Props) {
  const { t } = useTranslation('common_blog');
  const [name, setName] = useState(() => generateLiteName());
  const valid = isValidLiteName(name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px]" data-testid="lite-name-dialog">
        <DialogHeader>
          <DialogTitle>{t('lite_account.name_dialog.title')}</DialogTitle>
          <DialogDescription>{t('lite_account.name_dialog.description')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <label className="text-sm" htmlFor="lite-name">
            {t('lite_account.name_dialog.label')}
          </label>
          <div className="flex gap-2">
            <Input
              id="lite-name"
              value={name}
              onChange={(e) => setName(e.target.value.trim().toLowerCase())}
              data-testid="lite-name-input"
            />
            <Button type="button" variant="outline" onClick={() => setName(generateLiteName())} data-testid="lite-name-suggest">
              {t('lite_account.name_dialog.suggest_another')}
            </Button>
          </div>
          {!valid ? <p className="text-xs text-destructive">{t('lite_account.name_dialog.invalid_name')}</p> : null}
          <p className="text-xs text-muted-foreground">{t('lite_account.name_dialog.disposable_note')}</p>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t('lite_account.name_dialog.cancel')}
          </Button>
          <Button type="button" disabled={!valid} onClick={() => onConfirm(name)} data-testid="lite-name-confirm">
            {t('lite_account.name_dialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
