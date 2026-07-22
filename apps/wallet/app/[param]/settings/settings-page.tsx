'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Separator } from '@hive/ui';
import { Icons } from '@ui/components/icons';
import { cn, getCookie } from '@ui/lib/utils';
import { useTranslation } from '@/wallet/i18n/client';

const LANGUAGES = [
  { locale: 'ar', label: 'عر' },
  { locale: 'en', label: '🇬🇧' },
  { locale: 'es', label: '🇪🇸' },
  { locale: 'fr', label: '🇫🇷' },
  { locale: 'it', label: '🇮🇹' },
  { locale: 'ja', label: '🇯🇵' },
  { locale: 'ko', label: '🇰🇷' },
  { locale: 'pl', label: '🇵🇱' },
  { locale: 'ru', label: '🇷🇺' },
  { locale: 'zh', label: '🇨🇳' }
] as const;

const THEME_OPTIONS = [
  { value: 'light', icon: Icons.sun, labelKey: 'navigation.main_nav_bar.light' },
  { value: 'dark', icon: Icons.moon, labelKey: 'navigation.main_nav_bar.dark' },
  { value: 'system', icon: Icons.laptop, labelKey: 'navigation.main_nav_bar.system' }
] as const;

export default function SettingsPage() {
  const { t } = useTranslation('common_wallet');
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [lang, setLang] = useState<string | null>(null);

  useEffect(() => {
    const savedLang = getCookie('NEXT_LOCALE') || 'en';
    setLang(savedLang);
  }, []);

  const handleLanguageChange = (locale: string) => {
    document.cookie = 'NEXT_LOCALE=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    document.cookie = `NEXT_LOCALE=${locale}; path=/; SameSite=Lax`;
    setLang(locale);
    router.refresh();
    if (document.documentElement.lang !== locale) {
      window.location.reload();
    }
  };

  return (
    <div className="m-auto flex max-w-2xl flex-col bg-background p-4 pb-8">
      <h1 className="text-2xl font-bold">{t('settings.title')}</h1>

      <Separator className="my-6" />

      {/* Theme section */}
      <div data-testid="settings-theme-mode">
        <h2 className="py-4 text-lg font-semibold leading-5">
          {t('settings.theme_label')}
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {t('settings.theme_description')}
        </p>
        <div className="grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map(({ value, icon: Icon, labelKey }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border-2 px-4 py-4 text-sm transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                theme === value
                  ? 'border-primary bg-accent/50 ring-2 ring-primary ring-offset-2 ring-offset-background'
                  : 'border-input'
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="font-medium">{t(labelKey)}</span>
            </button>
          ))}
        </div>
      </div>

      <Separator className="my-8" />

      {/* Language section */}
      <div>
        <h2 className="py-4 text-lg font-semibold leading-5">
          {t('settings.language_label')}
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {t('settings.language_description')}
        </p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {LANGUAGES.map(({ locale, label }) => (
            <button
              key={locale}
              type="button"
              onClick={() => handleLanguageChange(locale)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border-2 px-4 py-4 text-sm transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                lang === locale
                  ? 'border-primary bg-accent/50 ring-2 ring-primary ring-offset-2 ring-offset-background'
                  : 'border-input'
              )}
            >
              <span className="text-2xl">{label}</span>
              <span className="font-medium">{locale.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
