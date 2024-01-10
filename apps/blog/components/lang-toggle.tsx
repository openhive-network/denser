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

export function LangToggle() {
  const router = useRouter();
  const [lang, setLang] = useState<string | null>(null);

  useEffect(() => {
    setLang(parseCookie(document.cookie)['NEXT_LOCALE']);
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
        <Button variant="ghost" size="sm" className="h-fit px-0 font-normal" data-testid="toggle-language">
          <span className="mr-2 w-6">
            {lang ? languages.filter((language) => language.locale === lang)[0].label : null}
          </span>
          <span>Toggle language</span>
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
            <span>{locale}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
