'use client';

import { useTheme } from 'next-themes';
import {
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from '@ui/components/dropdown-menu';
import { Icons } from '@ui/components/icons';
import { useTranslation } from '@/blog/i18n/client';

/** The Theme item of a dropdown menu: a submenu with Light / Dark / System radio items. */
export default function ThemeSubmenu() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation('common_blog');
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger
        className="cursor-pointer focus:bg-background-tertiary data-[state=open]:bg-background-tertiary"
        data-testid="theme-mode"
      >
        <span className="relative mr-2 h-6 w-6" aria-hidden="true">
          <Icons.sun className="absolute rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Icons.moon className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </span>
        <span className="w-full">{t('navigation.user_menu.toggle_theme')}</span>
      </DropdownMenuSubTrigger>
      {/* Portaled so the parent menu's overflow-hidden does not clip it */}
      <DropdownMenuPortal>
        <DropdownMenuSubContent className="bg-background-secondary">
          <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
            <DropdownMenuRadioItem value="light" data-testid="theme-mode-item">
              <Icons.sun className="mr-2 h-4 w-4" aria-hidden="true" />
              <span>{t('navigation.main_nav_bar.light')}</span>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark" data-testid="theme-mode-item">
              <Icons.moon className="mr-2 h-4 w-4" aria-hidden="true" />
              <span>{t('navigation.main_nav_bar.dark')}</span>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system" data-testid="theme-mode-item">
              <Icons.laptop className="mr-2 h-4 w-4" aria-hidden="true" />
              <span>{t('navigation.main_nav_bar.system')}</span>
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}
