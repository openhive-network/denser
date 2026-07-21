'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useTranslation } from '@/blog/i18n/client';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { extractUsernameFromParam } from '@/blog/utils/validate-links';
import { Icons } from '@ui/components/icons';
import { Separator } from '@ui/components/separator';
import { getLanguage, setLanguage } from '@/blog/utils/language';
import { cn } from '@ui/lib/utils';
import MutedList from '@/blog/features/account-settings/muted-list';

const LANGUAGES = [
  { locale: 'ar', label: 'عر' },
  { locale: 'en', label: '🇬🇧' },
  { locale: 'es', label: '🇪🇸' },
  { locale: 'fr', label: '🇫🇷' },
  { locale: 'it', label: '🇮🇹' },
  { locale: 'ja', label: '🇯🇵' },
  { locale: 'pl', label: '🇵🇱' },
  { locale: 'ru', label: '🇷🇺' },
  { locale: 'zh', label: '🇨🇳' }
] as const;

const THEME_OPTIONS = [
  { value: 'light', icon: Icons.sun, labelKey: 'navigation.main_nav_bar.light' },
  { value: 'dark', icon: Icons.moon, labelKey: 'navigation.main_nav_bar.dark' },
  { value: 'system', icon: Icons.laptop, labelKey: 'navigation.main_nav_bar.system' }
] as const;

const AppearancePage = () => {
  const { t } = useTranslation('common_blog');
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const params = useParams<{ param: string }>();
  const username = extractUsernameFromParam(params?.param ?? '') ?? '';
  const { user } = useUserClient();
  const isMyProfile = user?.isLoggedIn && user?.username === username;
  const [lang, setLang] = useState(getLanguage);

  if (!isMyProfile) {
    return <MutedList username={username} />;
  }

  const handleLanguageChange = (locale: string) => {
    setLanguage(locale);
    setLang(locale);
    router.refresh();
  };

  return (
    <div className="py-8">
      {/* Theme section */}
      <div data-testid="settings-theme-mode">
        <h2 className="py-4 text-lg font-semibold leading-5">
          {t('settings_page.theme_section_title')}
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {t('settings_page.theme_section_description')}
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
          {t('settings_page.language_section_title')}
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {t('settings_page.language_section_description')}
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
};

export default AppearancePage;
