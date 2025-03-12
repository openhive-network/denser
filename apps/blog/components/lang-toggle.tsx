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
import { getCookie } from '@smart-signer/lib/utils';
import clsx from 'clsx';
import { useTranslation } from 'next-i18next';
import TooltipContainer from '@ui/components/tooltip-container';

export default function LangToggle({ logged }: { logged: Boolean }) {
  const router = useRouter();
  const [lang, setLang] = useState<string | null>(null);
  const { t } = useTranslation('common_blog');

  useEffect(() => {
    setLang(getCookie('NEXT_LOCALE') || 'en');
  }, []);

  const languages = [
    { locale: 'ar', label: 'عر' },
    { locale: 'en', label: '🇬🇧' },
    { locale: 'es', label: '🇪🇸' },
    { locale: 'fr', label: '🇫🇷' },
    { locale: 'it', label: '🇮🇹' },
    { locale: 'ja', label: '🇯🇵' },
    { locale: 'pl', label: '🇵🇱' },
    { locale: 'ru', label: '🇷🇺' },
    { locale: 'zh', label: '🇨🇳' }
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <TooltipContainer title={t('navigation.main_nav_bar.language')}>
          <Button
            variant="ghost"
            size="sm"
            className={clsx('flex h-10 w-full p-0 text-start font-normal', { 'h-6': logged })}
            data-testid="toggle-language"
          >
            <span>{lang ? languages.filter((language) => language.locale === lang)[0].label : null}</span>
            {logged ? <span className="ml-2 w-full">{t('navigation.user_menu.toggle_lang')}</span> : null}
          </Button>
        </TooltipContainer>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map(({ locale, label }) => (
          <DropdownMenuItem
            key={label}
            onClick={() => {
              document.cookie = `NEXT_LOCALE=${locale}; SameSite=Lax`;
              router.reload();
            }}
          >
            {label}
            <span data-testid={locale}>&nbsp;{locale}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
