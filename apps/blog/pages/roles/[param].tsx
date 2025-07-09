import { FC, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import Loading from '@ui/components/loading';
import CustomError from '@/blog/components/custom-error';
import AddRole from '@/blog/feature/community-roles/add-role';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ui/components/table';
import { useTranslation } from 'next-i18next';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { getListCommunityRoles } from '@transaction/lib/bridge';
import { getCommunityMetadata, getTranslations, MetadataProps } from '@/blog/lib/get-translations';
import Head from 'next/head';
import { rolesLevels } from '@/blog/feature/community-roles/lib/utils';
import CommunityLayout from '@/blog/feature/community-layout/community-layout';

const RolesPage: FC<{ metadata: MetadataProps }> = ({ metadata }) => {
  const router = useRouter();
  const { user } = useUser();
  const [client, setClient] = useState(false);
  const { t } = useTranslation('common_blog');

  useEffect(() => {
    setClient(true);
  }, []);

  const tag = router.query.param as string;

  const { data, isLoading, isError } = useQuery(['rolesList', tag], () => getListCommunityRoles(tag), {
    enabled: Boolean(tag)
  });

  const userRole = data?.find((e) => e[0] === user.username);
  const roleValue = userRole
    ? (() => {
        const role = rolesLevels.find((e) => e.name === userRole[1]);
        return role ? { value: role.value, role: role.name, name: userRole[0], title: userRole[2] } : null;
      })()
    : null;
  const rolesValue = data?.map((e) => {
    const role = rolesLevels.find((r) => r.name === e[1]);
    return role ? { value: role.value, role: role.name, name: e[0], title: e[2] } : null;
  });

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
      {client ? (
        <CommunityLayout>
          <div className="my-4 flex w-full items-center justify-between" translate="no">
            <div className="m-2 w-full bg-background px-8 py-6">
              <h2 className="mb-1 text-2xl">{t('communities.user_roles')}</h2>
              <Table className="w-full border-[1px] border-solid border-secondary">
                <TableHeader className="text-">
                  <TableRow className="bg-secondary">
                    <TableHead className="px-2">{t('communities.account')}</TableHead>
                    <TableHead className="px-2">{t('communities.role')}</TableHead>
                    <TableHead className="px-2">{t('communities.title')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rolesValue?.map((e) =>
                    e ? (
                      <TableRow key={e.name}>
                        <TableCell className="p-2">
                          <Link href={`/@${e.name}`} className="text-destructive">
                            @{e.name}
                          </Link>
                        </TableCell>
                        {roleValue ? (
                          <TableCell className="border-x-[1px] border-solid border-secondary p-2">
                            {roleValue.value >= 4 && e.value < roleValue.value ? (
                              <span className="cursor-pointer text-destructive">{e.role}</span>
                            ) : (
                              <span>{e.role}</span>
                            )}
                          </TableCell>
                        ) : (
                          <TableCell>{e.role}</TableCell>
                        )}
                        <TableCell className="p-2">{e.title}</TableCell>
                      </TableRow>
                    ) : null
                  )}
                </TableBody>
              </Table>
              {roleValue && roleValue.value >= 3 && <AddRole user={roleValue} community={tag} />}
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
      ) : (
        <Loading loading />
      )}
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
