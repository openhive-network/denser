'use client';

import { useQuery } from '@tanstack/react-query';
import Loading from '@ui/components/loading';
import AddRole from '@/blog/features/community-roles/add-role';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@ui/components/table';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { getRoleValue, Roles, rolesLevels } from '@/blog/features/community-roles/lib/utils';
import TableItem from '@/blog/features/community-roles/table-item';
import NoDataError from '@/blog/components/no-data-error';
import { getListCommunityRoles } from '@transaction/lib/bridge-api';
import { useTranslation } from '@/blog/i18n/client';

const Content = ({ community }: { community: string }) => {
  const { user } = useUser();
  const { t } = useTranslation('common_blog');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['rolesList', community],
    queryFn: () => getListCommunityRoles(community),
    enabled: Boolean(community),
    select: (list) =>
      list
        ? list.map((e) => ({
            name: e[0],
            value: getRoleValue(e[1] as Roles),
            role: e[1] as Roles,
            title: e[2],
            temprary: !!e[3]
          }))
        : []
  });

  const loggedUser = data?.find((e) => e.name === user.username) ?? {
    value: 1,
    role: 'guest',
    name: user.username,
    title: ''
  };

  if (isLoading) return <Loading loading={isLoading} />;
  if (isError) return <NoDataError />;

  return (
    <div className="my-4 flex w-full items-center justify-between" translate="no">
      <div className="m-2 w-full bg-background px-8 py-6">
        <h2 className="mb-1 text-2xl">{t('communities.user_roles')}</h2>
        <Table className="w-full border-[1px] border-solid border-secondary">
          <TableHeader className="text-">
            <TableRow className="bg-secondary">
              <TableHead className="px-2">{t('communities.account')}</TableHead>
              <TableHead className="w-48 px-2">{t('communities.role')}</TableHead>
              <TableHead className="px-2">{t('communities.title')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((e) => (
              <TableItem loggedUserValue={loggedUser.value} item={e} community={community} key={e.name} />
            ))}
          </TableBody>
        </Table>
        {loggedUser.value >= 3 && <AddRole loggedUserLevel={loggedUser.value} community={community} />}
        <div className="mt-12">
          <h1>{t('communities.role_permissions')}</h1>
          <div className="text-sm">
            {rolesLevels.map((role) => (
              <div key={role.name}>
                <span className="font-bold"> {t(`communities.${role.name}`)}</span>
                <span>- {t(`communities.description_${role.name}`)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Content;
