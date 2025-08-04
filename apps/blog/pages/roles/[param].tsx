import { FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import Loading from '@ui/components/loading';
import CustomError from '@/blog/components/custom-error';
import AddRole from '@/blog/feature/community-roles/add-role';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@ui/components/table';
import { useTranslation } from 'next-i18next';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { getListCommunityRoles } from '@transaction/lib/bridge';
import { getCommunityMetadata, getTranslations, MetadataProps } from '@/blog/lib/get-translations';
import Head from 'next/head';
import { getRoleValue, Roles, rolesLevels } from '@/blog/feature/community-roles/lib/utils';
import CommunityLayout from '@/blog/feature/community-layout/community-layout';
import TableItem from '@/blog/feature/community-roles/table-item';

const RolesPage: FC<{ metadata: MetadataProps }> = ({ metadata }) => {
  const router = useRouter();
  const { user } = useUser();
  const { t } = useTranslation('common_blog');
  const community = router.query.param as string;

  const { data, isLoading, isError } = useQuery(
    ['rolesList', community],
    () => getListCommunityRoles(community),
    {
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
    }
  );

  const loggedUser = data?.find((e) => e.name === user.username) ?? {
    value: 1,
    role: 'guest',
    name: user.username,
    title: ''
  };

  if (isLoading) return <Loading loading={isLoading} />;
  if (isError) return <CustomError />;

  return (
    <>
      <Head>
        <title>{metadata.tabTitle}</title>
        <meta property="og:title" content={metadata.title} />
        <meta property="og:description" content={metadata.description} />
        <meta property="og:image" content={metadata.image} />
      </Head>
      <CommunityLayout community={community}>
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
      </CommunityLayout>
    </>
  );
};

export default RolesPage;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const firstParam = (ctx.params?.param as string) ?? '';
  return {
    props: {
      metadata: await getCommunityMetadata('Roles', firstParam, ''),
      ...(await getTranslations(ctx))
    }
  };
};
