'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@ui/components/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@ui/components/dialog';
import { toast } from '@ui/components/hooks/use-toast';
import { Input } from '@ui/components/input';
import { useTranslation } from '@/blog/i18n/client';
import { LITE_PROFILE_FIELDS, type LiteProfileFields } from './lite-social-state';
import { useLiteSocialMutation } from './use-lite-social-mutation';

type Field = (typeof LITE_PROFILE_FIELDS)[number];

/** The Hive profile settings' label of each field: the lite profile edits the same ones. */
const LABEL_KEYS: Record<Field, string> = {
  name: 'settings_page.profile_name',
  about: 'settings_page.profile_about',
  location: 'settings_page.profile_location',
  website: 'settings_page.profile_website',
  profile_image: 'settings_page.profile_image_url',
  cover_image: 'settings_page.cover_image_url'
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: LiteProfileFields;
  /** Called with the fields the gateway relayed: the card shows them at once. */
  onSaved: (fields: LiteProfileFields) => void;
};

/** The browser's own lite account's profile form, sent as one `set_profile` through the gateway. */
function LiteProfileForm({ fields, onOpenChange, onSaved }: Omit<Props, 'open'>) {
  const { t } = useTranslation('common_blog');
  const [draft, setDraft] = useState(fields);
  const mutation = useLiteSocialMutation('set_profile');
  const waiting = mutation.retrySecondsLeft !== null;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate(
      { method: 'set_profile', profile: draft },
      {
        onSuccess: () => {
          toast({ title: t('lite_account.social.profile_saved_title'), variant: 'success' });
          onSaved(draft);
          onOpenChange(false);
        }
      }
    );
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" data-testid="lite-profile-edit-form">
      {LITE_PROFILE_FIELDS.map((field) => (
        <label key={field} className="flex flex-col gap-1 text-sm">
          {t(LABEL_KEYS[field])}
          <Input
            value={draft[field] ?? ''}
            onChange={(e) => setDraft((prev) => ({ ...prev, [field]: e.target.value }))}
            data-testid={`lite-profile-field-${field}`}
          />
        </label>
      ))}
      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          {t('lite_account.manage.cancel')}
        </Button>
        <Button type="submit" disabled={mutation.isPending || waiting} data-testid="lite-profile-save">
          {waiting ? t('lite_account.gateway.post_wait', { seconds: mutation.retrySecondsLeft }) : t('lite_account.manage.save')}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Edit profile of the browser's own lite account: name, about, location, website and images. */
export default function LiteProfileEditDialog({ open, onOpenChange, fields, onSaved }: Props) {
  const { t } = useTranslation('common_blog');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="text-foreground" data-testid="lite-profile-edit-dialog">
        <DialogHeader>
          <DialogTitle>{t('lite_account.profile.edit_title')}</DialogTitle>
        </DialogHeader>
        {open ? <LiteProfileForm fields={fields} onOpenChange={onOpenChange} onSaved={onSaved} /> : null}
      </DialogContent>
    </Dialog>
  );
}
