import { useMutation } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { getLogger } from '@ui/lib/logging';
import { handleError } from '@ui/lib/utils';
const logger = getLogger('app');

interface MuteParams {
  username: string;
}

/**
 * Makes mute transaction.
 *
 * @export
 * @return {*}
 */
export function useMuteMutation() {
  const muteMutation = useMutation({
    mutationFn: async (params: MuteParams) => {
      const { username } = params;

      await transactionService.mute(username);

      logger.info('Muted: %o', params);
      return params;
    },
    onSuccess: (data) => {
      logger.info('useMuteMutation onSuccess data: %o', data);
    }
  });

  const mute = async (params: MuteParams) => {
    try {
      await muteMutation.mutateAsync(params);
    } catch (error) {
      handleError(error, { method: 'mute', ...params });
    }
  };

  return { mute, muteMutation };
}

interface UnmuteParams {
  username: string;
}

/**
 * Makes unmute transaction.
 *
 * @export
 * @return {*}
 */
export function useUnmuteMutation() {
  const unmuteMutation = useMutation({
    mutationFn: async (params: UnmuteParams) => {
      const { username } = params;

      await transactionService.unmute(username);

      logger.info('Unmuted: %o', params);
      return params;
    },
    onSuccess: (data) => {
      logger.info('useUnmuteMutation onSuccess data: %o', data);
    }
  });

  const unmute = async (params: UnmuteParams) => {
    try {
      await unmuteMutation.mutateAsync(params);
    } catch (error) {
      handleError(error, { method: 'unmute', ...params });
    }
  };

  return { unmute, unmuteMutation };
}
