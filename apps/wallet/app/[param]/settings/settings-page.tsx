'use client';

import { Separator } from '@hive/ui';
import { Icons } from '@ui/components/icons';
import { Button } from '@ui/components';
import ModeToggle from '@/wallet/components/mode-toggle';
import LangToggle from '@/wallet/components/lang-toggle';
import { useTranslation } from '@/wallet/i18n/client';

export default function SettingsPage() {
  const { t } = useTranslation('common_wallet');

  return (
    <div className="m-auto flex max-w-2xl flex-col gap-4 bg-background p-4 pb-8">
      <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
      <Separator />

      <section className="flex flex-col gap-6">
        <h2 className="text-lg font-semibold">{t('settings.appearance')}</h2>

        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t('settings.theme_label')}</span>
            <span className="text-sm text-muted-foreground">
              {t('settings.theme_description')}
            </span>
          </div>
          <ModeToggle>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              data-testid="settings-theme-mode"
            >
              <Icons.sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Icons.moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="ml-4">{t('settings.theme_label')}</span>
            </Button>
          </ModeToggle>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t('settings.language_label')}</span>
            <span className="text-sm text-muted-foreground">
              {t('settings.language_description')}
            </span>
          </div>
          <LangToggle logged={false} />
        </div>
      </section>
    </div>
  );
}
