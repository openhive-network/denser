import { getAccountFull } from '@transaction/lib/hive-api';
import { getCommunity } from '@transaction/lib/bridge-api';

export const getAccountMetadata = async (
  firstParam: string,
  descriptionText: string
): Promise<MetadataProps> => {
  let metadata = {
    tabTitle: '',
    description: '',
    image: '',
    title: firstParam
  };
  if (firstParam.startsWith('@')) {
    try {
      const username = firstParam.split('@')[1];
      const data = await getAccountFull(username);

      if (!data) {
        throw new Error(`Account ${username} not found`);
      }

      const displayName = data.profile?.name || data.name;
      const defaultImage = 'https://hive.blog/images/hive-blog-share.png';

      metadata = {
        ...metadata,
        image: data.profile?.profile_image || defaultImage,
        tabTitle:
          displayName === username
            ? `${descriptionText} ${displayName} - Hive`
            : `${descriptionText} ${displayName} (${firstParam}) - Hive`,
        description:
          data.profile?.about || `${descriptionText} ${firstParam}. Hive: Communities Without Borders.`
      };
    } catch (error) {
      console.error('Error fetching account:', error);
    }
  }
  return metadata;
};
export const getCommunityMetadata = async (
  firstParam: string,
  secondParam: string,
  descriptionText: string
): Promise<MetadataProps> => {
  let metadata = {
    tabTitle: '',
    description: '',
    image: '',
    title: firstParam
  };

  try {
    if (secondParam === '' || !secondParam.startsWith('hive-')) {
      const defaultMetadata = {
        tabTitle: '',
        description: '',
        image: 'https://hive.blog/images/hive-blog-share.png',
        title: firstParam
      };
      return defaultMetadata;
    }
    // Fetch community data
    const data = await getCommunity(secondParam);
    // If the community data does not exist, throw an error
    if (!data) throw new Error(`Community ${secondParam} not found`);

    // If the community data exists, set the username to the community title or name
    const communityName = data?.title ?? data.name;
    metadata.tabTitle = `${communityName} / ${firstParam} - Hive`;
    metadata.description =
      data?.description || `${descriptionText} ${secondParam}. Hive: Communities Without Borders.`;
    metadata.image = data?.avatar_url || 'https://hive.blog/images/hive-blog-share.png';
    metadata.title = communityName;
  } catch (error) {
    console.error('Error fetching community:', error);
  }

  return metadata;
};
export interface MetadataProps {
  tabTitle: string;
  description: string;
  image: string;
  title: string;
}
