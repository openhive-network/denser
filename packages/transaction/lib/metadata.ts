import { getAccountFull } from './hive-api';
import { getCommunity } from './bridge-api';
import { MetadataProps } from './app-types';

// Re-export MetadataProps type for consumers
export type { MetadataProps } from './app-types';

const DEFAULT_IMAGE = 'https://hive.blog/images/hive-blog-share.png';

/**
 * Get metadata for a user account page
 * @param firstParam - The username with @ prefix (e.g. "@username")
 * @param descriptionText - Text to prepend to description (e.g. "Posts by")
 * @returns MetadataProps for SEO
 */
export const getAccountMetadata = async (
  firstParam: string,
  descriptionText: string
): Promise<MetadataProps> => {
  let metadata: MetadataProps = {
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

      metadata = {
        ...metadata,
        image: data.profile?.profile_image || DEFAULT_IMAGE,
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

/**
 * Get metadata for a community page
 * @param firstParam - Primary display param (e.g. page title)
 * @param secondParam - Community identifier (e.g. "hive-123456")
 * @param descriptionText - Text to prepend to description
 * @returns MetadataProps for SEO
 */
export const getCommunityMetadata = async (
  firstParam: string,
  secondParam: string,
  descriptionText: string
): Promise<MetadataProps> => {
  let metadata: MetadataProps = {
    tabTitle: '',
    description: '',
    image: '',
    title: firstParam
  };

  try {
    if (secondParam === '' || !secondParam.startsWith('hive-')) {
      return {
        tabTitle: '',
        description: '',
        image: DEFAULT_IMAGE,
        title: firstParam
      };
    }

    const data = await getCommunity(secondParam);

    if (!data) {
      throw new Error(`Community ${secondParam} not found`);
    }

    const communityName = data?.title ?? data.name;
    metadata.tabTitle = `${communityName} / ${firstParam} - Hive`;
    metadata.description =
      data?.description || `${descriptionText} ${secondParam}. Hive: Communities Without Borders.`;
    metadata.image = data?.avatar_url || DEFAULT_IMAGE;
    metadata.title = communityName;
  } catch (error) {
    console.error('Error fetching community:', error);
  }

  return metadata;
};
