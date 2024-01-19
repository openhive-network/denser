import * as React from 'react';
import { Button } from '@hive/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@hive/ui/components/dropdown-menu';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { parseCookie } from '@/blog/lib/utils';
import clsx from 'clsx';

export default function LangToggle({ logged }: { logged: Boolean }) {
  const router = useRouter();
  const [lang, setLang] = useState<string | null>(null);

  useEffect(() => {
    setLang(parseCookie(document.cookie)['NEXT_LOCALE'] || 'en');
  }, []);

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
        <Button
          variant="ghost"
          size="sm"
          className={clsx('flex h-10 w-full p-0 text-start font-normal', { 'h-6': logged })}
          data-testid="toggle-language"
        >
          {console.log(lang)}
          <span>{lang ? languages.filter((language) => language.locale === lang)[0].label : null}</span>
          {logged ? <span className="ml-2 w-full">Toggle language</span> : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map(({ locale, label }) => (
          <DropdownMenuItem
            key={label}
            onClick={() => {
              document.cookie = `NEXT_LOCALE=${locale};path=/`;
              router.reload();
            }}
          >
            {label}
            <span data-testid={locale}>{locale}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
