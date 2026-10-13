'use client';

import {
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from '@ui/components/dropdown-menu';
import { useTranslation } from '@/blog/i18n/client';
import { LANGUAGES, useLanguageSwitch } from './use-language-switch';

/** The Language item of a dropdown menu: a submenu with one radio item per locale. */
export default function LangSubmenu() {
  const { lang, label, changeLanguage } = useLanguageSwitch();
  const { t } = useTranslation('common_blog');
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger
        className="cursor-pointer focus:bg-background-tertiary data-[state=open]:bg-background-tertiary"
        data-testid="toggle-language"
      >
        <span className="mr-2 w-6 text-center" aria-hidden="true">
          {label}
        </span>
        <span className="w-full">{t('navigation.user_menu.toggle_lang')}</span>
      </DropdownMenuSubTrigger>
      {/* Portaled so the parent menu's overflow-hidden does not clip it */}
      <DropdownMenuPortal>
        <DropdownMenuSubContent className="bg-background-secondary">
          <DropdownMenuRadioGroup value={lang} onValueChange={changeLanguage}>
            {LANGUAGES.map(({ locale, label }) => (
              <DropdownMenuRadioItem key={locale} value={locale}>
                {label}
                <span data-testid={locale}>&nbsp;{locale}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}
