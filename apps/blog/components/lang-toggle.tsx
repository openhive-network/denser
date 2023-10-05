'use client';

import * as React from 'react';
import { Button } from '@hive/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@hive/ui/components/dropdown-menu';
import { useContext, useEffect } from 'react';
import { useRouter } from 'next/router';
import { LangContext } from '@/blog/components/common/providers';


function usePersistLocaleCookie() {
  const { locale, defaultLocale } = useRouter();

  useEffect(persistLocaleCookie, [locale, defaultLocale]);

  function persistLocaleCookie() {
    if (locale !== defaultLocale) {
      const date = new Date();
      const expireMs = 100 * 24 * 60 * 60 * 1000; // 100 days
      date.setTime(date.getTime() + expireMs);
      document.cookie = `NEXT_LOCALE=${locale};expires=${date.toUTCString()};path=/`;
    }
  }
}

export function LangToggle() {
  const [lang, setLang] = useContext(LangContext);
  const languages = [
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='sm' className='h-10 w-10 px-0' data-testid='theme-mode'>
          <span>{languages.filter(language => language.locale === lang)[0].label}</span>
          <span className='sr-only'>Toggle language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        {languages.map(({ locale, label }) => (
          <DropdownMenuItem key={label} onClick={() => setLang(locale)}>
            {label}
            <span>{locale}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}