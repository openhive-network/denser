'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@ui/components/dropdown-menu';
import { Icons } from '@ui/components/icons';
import { useTranslation } from '@/blog/i18n/client';
import TooltipContainer from '@ui/components/tooltip-container';

export default function ModeToggle({ children }: { children: React.ReactNode }) {
  const { setTheme } = useTheme();
  const { t } = useTranslation('common_blog');
  return (
    <DropdownMenu>
      <TooltipContainer title={t('navigation.main_nav_bar.theme')}>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      </TooltipContainer>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')} data-testid="theme-mode-item">
          <Icons.sun className="mr-2 h-4 w-4" />
          <span>{t('navigation.main_nav_bar.light')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')} data-testid="theme-mode-item">
          <Icons.moon className="mr-2 h-4 w-4" />
          <span>{t('navigation.main_nav_bar.dark')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')} data-testid="theme-mode-item">
          <Icons.laptop className="mr-2 h-4 w-4" />
          <span>{t('navigation.main_nav_bar.system')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
