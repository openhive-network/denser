import { getFollowList } from '@transaction/lib/bridge-api';
import { extractSocialAccountFromParam } from '@/blog/lib/hive-account-route';
import { isLiteDid } from '@/blog/features/lite-account/lite-did';
import LiteFollowList from '@/blog/features/lite-account/lite-follow-list';
import { notFound } from 'next/navigation';
import { getLogger } from '@ui/lib/logging';
import MutedContent from './content';

const logger = getLogger('app');
const type = 'muted';

const MutedPage = async (props: { params: Promise<{ param: string }> }) => {
  const params = await props.params;
  const username = await extractSocialAccountFromParam(params.param);
  if (!username) notFound();
  if (isLiteDid(username)) return <LiteFollowList account={username} list="muted" />;

  let initialData = null;
  try {
    initialData = (await getFollowList(username, type)) ?? null;
  } catch (error) {
    logger.error(error, 'Error fetching muted list:');
  }

  return <MutedContent param={params.param} initialData={initialData} />;
};
export default MutedPage;
