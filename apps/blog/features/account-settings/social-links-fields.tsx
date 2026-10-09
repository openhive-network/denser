'use client';

import { useTranslation } from '@/blog/i18n/client';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { SOCIAL_KEYS, type SocialKey } from '@/blog/features/layouts/user-profile/lib/social-links';
import type { Settings } from './lib/utils';

interface SocialLinksFieldsProps {
  social: Settings['social'];
  errors: Partial<Record<SocialKey, string>>;
  onChange: (key: SocialKey, value: string) => void;
}

/** Inputs for the social handles stored in `posting_json_metadata.profile.social`. */
const SocialLinksFields = ({ social, errors, onChange }: SocialLinksFieldsProps) => {
  const { t } = useTranslation('common_blog');

  return (
    <div className="pt-8" data-testid="settings-social-links">
      <h3 className="text-base font-semibold leading-5">{t('settings_page.social_links')}</h3>
      <p className="pb-4 pt-1 text-sm text-muted-foreground">{t('settings_page.social_links_description')}</p>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {SOCIAL_KEYS.map((key) => (
          <div key={key}>
            <Label htmlFor={`social-${key}`}>{t(`user_profile.social.platforms.${key}`)}</Label>
            <Input
              type="text"
              id={`social-${key}`}
              name={`social-${key}`}
              value={social[key]}
              placeholder={t(`settings_page.social_placeholders.${key}`)}
              onChange={(e) => onChange(key, e.target.value)}
            />
            <span className="pt-2 text-xs text-destructive">{errors[key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SocialLinksFields;
