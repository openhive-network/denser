'use client';

import * as React from 'react';
import { Button } from '@ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@ui/components/dropdown-menu';
import { useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'next-i18next';
import TooltipContainer from '@ui/components/tooltip-container';
import { getLanguage, setLanguage } from '../../utils/language';
import { useRouter } from 'next/navigation';

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

export default function LangToggle({ logged, className }: { logged: Boolean; className?: string }) {
  const router = useRouter();
  const [lang, setLang] = useState(getLanguage());
  const { t } = useTranslation('common_blog');

  const handleLanguageChange = (locale: string) => {
    setLanguage(locale);
    setLang(locale);
    router.refresh();
  };

  return (
    <DropdownMenu>
      <TooltipContainer title={t('navigation.main_nav_bar.language')}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={clsx('flex h-10 w-full p-0 text-start font-normal', className, { 'h-6': logged })}
            data-testid="toggle-language"
          >
            <span>{lang ? languages.find((language) => language.locale === lang)?.label : null}</span>
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
