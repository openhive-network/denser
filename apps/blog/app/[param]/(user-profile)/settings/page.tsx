import SettingsContent from './content';
import { getFollowList } from '@transaction/lib/bridge-api';
import { extractUsernameFromParam } from '@/blog/utils/validate-links';
import { notFound } from 'next/navigation';
import { getLogger } from '@ui/lib/logging';
import { InitialFollowListProvider } from '@/blog/components/observer-provider';

const logger = getLogger('app');

const SettingsPage = async ({ params }: { params: { param: string } }) => {
  const username = extractUsernameFromParam(params.param);
  if (!username) notFound();

  // Fetch muted list on server and pass via context.
  // profileData is already cached from the user-profile layout.
  // Using context+initialData instead of Hydrate/dehydrate to avoid
  // overwriting optimistic cache updates on navigation.
  let mutedData = null;
  try {
    mutedData = (await getFollowList(username, 'muted')) ?? null;
  } catch (error) {
    logger.error(error, 'Error in SettingsPage:');
  }

  return (
    <InitialFollowListProvider value={mutedData}>
      <SettingsContent username={username} />
    </InitialFollowListProvider>
  );
};

export default SettingsPage;
