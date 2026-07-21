import { ReactNode } from 'react';
import { Metadata } from 'next';
import { getFollowList } from '@transaction/lib/bridge-api';
import { extractUsernameFromParam } from '@/blog/utils/validate-links';
import { notFound } from 'next/navigation';
import { getLogger } from '@ui/lib/logging';
import { InitialFollowListProvider } from '@/blog/components/observer-provider';
import SettingsTabNav from './settings-tab-nav';

const logger = getLogger('app');

export async function generateMetadata({ params }: { params: { param: string } }): Promise<Metadata> {
  const username = params?.param?.startsWith('%40') ? params.param.replace('%40', '') : params.param;

  const title = `Settings ${username}`;

  return {
    title
  };
}

export default async function SettingsLayout({
  children,
  params
}: {
  children: ReactNode;
  params: { param: string };
}) {
  const username = extractUsernameFromParam(params.param);
  if (!username) notFound();

  let mutedData = null;
  try {
    mutedData = (await getFollowList(username, 'muted')) ?? null;
  } catch (error) {
    logger.error(error, 'Error fetching muted list in SettingsLayout:');
  }

  return (
    <InitialFollowListProvider value={mutedData}>
      <div className="flex flex-col" data-testid="public-profile-settings">
        <SettingsTabNav username={username} />
        {children}
      </div>
    </InitialFollowListProvider>
  );
}
