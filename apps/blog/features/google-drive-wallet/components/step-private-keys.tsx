'use client';

import { Eye, EyeOff, Plus, ShieldAlert, X } from 'lucide-react';
import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@ui/components/select';
import type { TRole } from '@smart-signer/lib/google-drive-wallet-manager';
import { useTranslation } from '@/blog/i18n/client';

const AVAILABLE_ROLES: TRole[] = ['posting', 'active', 'owner', 'memo'];


export interface KeyField {
  role: TRole | '';
  privateKey: string;
  showKey: boolean;
}

interface StepPrivateKeysProps {
  keyFields: KeyField[];
  onAddKeyField: () => void;
  onRemoveKeyField: (index: number) => void;
  onUpdateKeyField: (index: number, updates: Partial<KeyField>) => void;
  availableRolesToAdd: TRole[];
  usedRoles: Array<TRole | ''>;
  disabled: boolean;
}

export function StepPrivateKeys({
  keyFields,
  onAddKeyField,
  onRemoveKeyField,
  onUpdateKeyField,
  availableRolesToAdd,
  usedRoles,
  disabled
}: StepPrivateKeysProps) {
  const { t } = useTranslation('common_blog');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">
          {t('google_drive_wallet.create_dialog.private_keys_label')}
        </Label>
        {availableRolesToAdd.length > 0 && (
          <Button variant="outline" size="sm" onClick={onAddKeyField} disabled={disabled}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            {t('google_drive_wallet.create_dialog.add_key')}
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {t('google_drive_wallet.create_dialog.keys_hint')}
      </p>

      <div className="space-y-3">
        {keyFields.map((field, index) => (
          <div key={index} className="space-y-2 rounded-lg border border-border/50 p-3">
            <div className="flex items-center gap-2">
              <Select
                value={field.role}
                onValueChange={(val) => onUpdateKeyField(index, { role: val as TRole })}
                disabled={disabled}
              >
                <SelectTrigger className="h-9 flex-1">
                  <SelectValue placeholder={t('google_drive_wallet.create_dialog.select_role')} />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_ROLES.map((role) => (
                    <SelectItem
                      key={role}
                      value={role}
                      disabled={usedRoles.includes(role) && field.role !== role}
                    >
                      <span className="font-medium capitalize">{role}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {keyFields.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 flex-shrink-0 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemoveKeyField(index)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {field.role && (
              <p className="text-xs text-muted-foreground">
                {t(`google_drive_wallet.roles.${field.role}_desc`)}
              </p>
            )}

            <div className="relative">
              <Input
                type={field.showKey ? 'text' : 'password'}
                value={field.privateKey}
                onChange={(e) => onUpdateKeyField(index, { privateKey: e.target.value })}
                placeholder={`${t('google_drive_wallet.create_dialog.enter_key_placeholder')} ${field.role || '...'}`}
                className="h-9 pr-10 font-mono text-xs"
                disabled={disabled}
                autoComplete="off"
              />
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => onUpdateKeyField(index, { showKey: !field.showKey })}
                tabIndex={-1}
              >
                {field.showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
        {t('google_drive_wallet.create_dialog.security_note')}
      </p>
    </div>
  );
}

export { AVAILABLE_ROLES };
