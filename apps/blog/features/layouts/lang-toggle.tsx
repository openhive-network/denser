'use client';

import * as React from 'react';
import { Button } from '@ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@ui/components/dropdown-menu';
import clsx from 'clsx';
import { useTranslation } from '@/blog/i18n/client';
import TooltipContainer from '@ui/components/tooltip-container';
import { LANGUAGES, useLanguageSwitch } from './use-language-switch';

export default function LangToggle({ className }: { className?: string }) {
  const { label, changeLanguage } = useLanguageSwitch();
  const { t } = useTranslation('common_blog');

  return (
    <DropdownMenu>
      <TooltipContainer title={t('navigation.main_nav_bar.language')}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={clsx('flex h-10 w-full p-0 text-start font-normal', className)}
            data-testid="toggle-language"
          >
            <span>{label}</span>
          </Button>
        </DropdownMenuTrigger>
      </TooltipContainer>
      <DropdownMenuContent align="end">
        {LANGUAGES.map(({ locale, label }) => (
          <DropdownMenuItem key={label} onClick={() => changeLanguage(locale)}>
            {label}
            <span data-testid={locale}>&nbsp;{locale}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
