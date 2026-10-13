import { getCommunity } from './bridge-api';
import { FullAccount, MetadataProps } from '@hive/common-hiveio-packages/wax';

// Re-export MetadataProps type for consumers
export type { MetadataProps } from '@hive/common-hiveio-packages/wax';

const DEFAULT_IMAGE = 'https://hive.blog/images/hive-blog-share.png';

/**
 * Build metadata for a user account page
 * @param account - The account, as getAccountFull returns it
 * @param descriptionText - Text to prepend to description (e.g. "Posts by")
 * @returns MetadataProps for SEO
 */
export const buildAccountMetadata = (account: FullAccount, descriptionText: string): MetadataProps => {
  const firstParam = `@${account.name}`;
  const displayName = account.profile?.name || account.name;

  return {
    title: firstParam,
    image: account.profile?.profile_image || DEFAULT_IMAGE,
    tabTitle:
      displayName === account.name
        ? `${descriptionText} ${displayName} - Hive`
        : `${descriptionText} ${displayName} (${firstParam}) - Hive`,
    description: account.profile?.about || `${descriptionText} ${firstParam}. Hive: Communities Without Borders.`
  };
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
