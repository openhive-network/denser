'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ui/components/dialog';
import { Button } from '@ui/components';
import { FC } from 'react';
import { create, InstanceProps } from 'react-modal-promise';
import { Icons } from '@ui/components/icons';

const HIVE_BRIDGE_URL = 'https://auth.openhive.network';

interface GoogleDriveErrorDialogProps {
  errorType: 'wallet_not_found' | 'key_not_found';
  username?: string;
  keyType?: string;
}

export const GoogleDriveErrorDialog: FC<GoogleDriveErrorDialogProps & InstanceProps<unknown>> = ({
  isOpen = false,
  onReject,
  errorType,
  username,
  keyType
}) => {
  const onOpenChange = (value: boolean) => {
    if (!value) {
      onReject?.('User closed dialog');
    }
  };

  const onInteractOutside = (e: CustomEvent) => {
    e.preventDefault();
  };

  const handleGoToBridge = () => {
    window.open(HIVE_BRIDGE_URL, '_blank', 'noopener,noreferrer');
  };

  const handleClose = () => {
    onReject?.('User closed dialog');
  };

  const title = errorType === 'wallet_not_found'
    ? 'Wallet Not Found'
    : 'Key Not Found';

  const description = errorType === 'wallet_not_found'
    ? 'No Hive wallet was found in your Google Drive. Please create a wallet first using Hive Bridge.'
    : `The ${keyType} key for @${username} was not found in your Google Drive wallet. Please add this key using Hive Bridge.`;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" onInteractOutside={onInteractOutside}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icons.google className="h-6 w-6" />
            {title}
          </DialogTitle>
          <DialogDescription className="pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 rounded-md bg-muted p-4">
          <p className="text-sm text-muted-foreground">
            Hive Bridge allows you to securely store your Hive keys in Google Drive.
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleGoToBridge} className="flex items-center gap-2">
            <Icons.externalLink className="h-4 w-4" />
            Go to Hive Bridge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const GoogleDriveErrorDialogPromise = create(GoogleDriveErrorDialog);
