import { EAvailableCommunityRoles } from '@hiveio/wax';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { Community } from '@hive/common-hiveio-packages/wax';
import { OBSERVE, useOperationMutation } from '@ui/components/hooks/use-operation-mutation';

type SetRoleParams = { community: string; username: string; role: EAvailableCommunityRoles };

/** Replaces the member's role in a `[username, role, title, ...]` list, or appends `newItem`. */
function withRole(list: string[][], { username, role }: SetRoleParams, newItem: string[]): string[][] {
  if (!list.some((item) => item[0] === username)) return [...list, newItem];
  return list.map((item) => (item[0] === username ? [username, role, item[2]] : item));
}

export const useSetRoleMutation = () =>
  useOperationMutation({
    name: 'useSetRoleMutation',
    run: ({ community, username, role }: SetRoleParams) =>
      transactionService.setRole(community, username, role, OBSERVE),
    onSuccess: (_data, params, queryClient) => {
      const { community, username, role } = params;
      const newItem = [username, role, '', 'true'];
      const prevRolesData: string[][] | undefined = queryClient.getQueryData(['rolesList', community]);
      if (prevRolesData)
        queryClient.setQueryData(['rolesList', community], withRole(prevRolesData, params, newItem));
      const prevCommunityData: Community | undefined = queryClient.getQueryData(['community', community]);
      if (prevCommunityData) {
        queryClient.setQueryData(['community', community], {
          ...prevCommunityData,
          team: withRole(prevCommunityData.team, params, newItem)
        });
      }
    },
    successToast: (_data, { community, username }) => ({
      title: 'Success',
      description: `Role updated successfully for ${username} in community ${community}.`
    }),
    invalidate: ({ community }) => [
      ['rolesList', community],
      ['community', community]
    ],
    invalidateDelays: [4000],
    reportErrors: false
  });
