'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import DialogLogin from '@/blog/components/dialog-login';
import { liteRelayInfoQuery } from './lite-relay-info-query';

const SUBMIT_PATH = '/submit.html';

/**
 * The "Write post" control of a reader who is not logged in: opens the editor when this deployment
 * runs a lite gateway (guest posting), the sign-in dialog otherwise. The gateway is asked on the
 * click, not on every page load.
 */
export default function GuestWritePostTrigger({ children }: { children: (onClick: () => void) => ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loginOpen, setLoginOpen] = useState(false);

  const onClick = async () => {
    const info = await queryClient.fetchQuery(liteRelayInfoQuery).catch(() => null);
    if (info?.enabled) router.push(SUBMIT_PATH);
    else setLoginOpen(true);
  };

  return (
    <>
      {children(() => void onClick())}
      <DialogLogin open={loginOpen} onOpenChange={setLoginOpen} redirectTo={SUBMIT_PATH} />
    </>
  );
}
