import { Community } from '@hive/common-hiveio-packages/wax';
import { getCommunity } from '../../bridge-api';
import { ExistenceResult } from '../types';

/**
 * Checks if a Hive community exists.
 * Wraps getCommunity with ExistenceResult discriminated union.
 *
 * API behavior: bridge.get_community returns:
 * - Community object for existing communities
 * - null for valid-format nonexistent communities
 * - Error -32602 for invalid community format
 */
export async function checkCommunityExists(
  name: string,
  observer: string = ''
): Promise<ExistenceResult<Community>> {
  try {
    const community = await getCommunity(name, observer);

    if (!community) {
      return { status: 'not_found' };
    }

    return { status: 'exists', data: community };
  } catch (error) {
    return {
      status: 'api_error',
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}
