import { Roles } from '@/blog/feature/community-roles/lib/utils';
import { EAvailableCommunityRoles } from '@hiveio/wax';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { Community } from '@transaction/lib/extended-hive.chain';
import { toast } from '@ui/components/hooks/use-toast';
import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

/**
 * Set roles in community.
 *
 * @export
 * @return {*}
 */

export function useSetRoleMutation() {
  const queryClient = useQueryClient();
  const setRoleMutation = useMutation({
    mutationFn: async (params: { community: string; username: string; role: EAvailableCommunityRoles }) => {
      const { community, username, role } = params;
      const broadcastResult = await transactionService.setRole(community, username, role, {
        observe: true
      });
      const prevRolesData: string[][] | undefined = queryClient.getQueryData(['rolesList', community]);
      const prevCommunityData: Community | undefined = queryClient.getQueryData(['community', community]);
      const response = { ...params, broadcastResult, prevRolesData, prevCommunityData };

      return response;
    },
    onSettled: (data) => {
      if (!data) return;
      const { community, username, prevRolesData, prevCommunityData, role } = data;
      const newItem = [username, role, '', 'true'];
      if (!!prevRolesData) {
        const existingItem = prevRolesData.find((item) => item[0] === username);
        const updatedRoles = existingItem
          ? prevRolesData.map((item) => {
              if (item[0] === username) {
                // item[4] is the temprary flag, if it exists
                return [username, role, item[2]];
              }
              return item;
            })
          : [...prevRolesData, newItem];
        queryClient.setQueryData(['rolesList', community], updatedRoles);
      }
      if (!!prevCommunityData) {
        const existingTeamMember = prevCommunityData.team.find((member) => member[0] === username);
        const updatedCommunity = {
          ...prevCommunityData,
          team: existingTeamMember
            ? prevCommunityData.team.map((member) => {
                if (member[0] === username) {
                  return [username, role, member[2]];
                }
                return member;
              })
            : [...prevCommunityData.team, newItem]
        };
        queryClient.setQueryData(['community', community], updatedCommunity);
      }
    },
    onSuccess: (data) => {
      const { community } = data;
      toast({
        title: 'Success',
        description: `Role updated successfully for ${data.username} in community ${community}.`,
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['rolesList', community] });
        queryClient.invalidateQueries({ queryKey: ['community', community] });
      }, 4000);
    }
  });

  return setRoleMutation;
}
