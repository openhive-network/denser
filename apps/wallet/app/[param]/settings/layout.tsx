'use client';

import { ReactNode } from 'react';
import { useParams } from 'next/navigation';
import SettingsTabNav from './settings-tab-nav';

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ param: string }>();
  const param = decodeURIComponent(params?.param ?? '');
  const username = param.startsWith('@') ? param.slice(1) : '';

  return (
    <div className="flex flex-col" data-testid="wallet-settings">
      <div className="m-auto w-full max-w-2xl px-4 pt-4">
        <SettingsTabNav username={username} />
      </div>
      {children}
    </div>
  );
}
