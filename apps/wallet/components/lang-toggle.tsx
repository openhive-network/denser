import * as React from 'react';
import { Button } from '@ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@ui/components/dropdown-menu';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getCookie } from '@ui/lib/utils';
import clsx from 'clsx';
import { useTranslation } from 'next-i18next';
import TooltipContainer from '@ui/components/tooltip-container';

export default function LangToggle({ logged }: { logged: Boolean }) {
  const router = useRouter();
  const [lang, setLang] = useState<string | null>(null);
  const { t } = useTranslation('common_wallet');

  useEffect(() => {
    const savedLang = getCookie('NEXT_LOCALE') || 'en';
    if (!lang) {
      setLang(savedLang);
      if (router.locale !== savedLang) {
        router.push(router.asPath, router.asPath, { locale: savedLang });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const languages = [
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
  ];

  const handleLanguageChange = (locale: string) => {
    // Delete any existing NEXT_LOCALE cookies first
    document.cookie = 'NEXT_LOCALE=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    // Set new cookie with proper path and attributes
    document.cookie = `NEXT_LOCALE=${locale}; path=/; SameSite=Lax`;
    setLang(locale);

    // Update the URL and locale using Next.js router
    router.push(router.asPath, router.asPath, { locale }).then(() => {
      // Only reload if absolutely necessary
      if (document.documentElement.lang !== locale) {
        router.reload();
      }
    });
  };

  return (
    <DropdownMenu>
      <TooltipContainer title={t('navigation.main_nav_bar.language')}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={clsx('flex h-10 w-full p-0 text-start font-normal', { 'h-6': logged })}
            data-testid="toggle-language"
          >
            <span>{lang ? languages.filter((language) => language.locale === lang)[0].label : null}</span>
            {logged ? <span className="ml-2 w-full">{t('navigation.user_menu.toggle_lang')}</span> : null}
          </Button>
        </DropdownMenuTrigger>
      </TooltipContainer>
      <DropdownMenuContent align="end">
        {languages.map(({ locale, label }) => (
          <DropdownMenuItem key={label} onClick={() => handleLanguageChange(locale)}>
            {label}
            <span data-testid={locale}>&nbsp;{locale}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
