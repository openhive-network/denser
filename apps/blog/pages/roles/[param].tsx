import { FC, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { GetServerSideProps } from 'next';

import CommunitiesMybar from '@/blog/components/communities-mybar';
import CommunitiesSidebar from '@/blog/components/communities-sidebar';
import Loading from '@ui/components/loading';
import CustomError from '@/blog/components/custom-error';
import CommunityDescription from '@/blog/components/community-description';
import CommunitySimpleDescription from '@/blog/components/community-simple-description';
import AddRole from '@/blog/components/add-role';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ui/components/table';
import { Button } from '@ui/components';
import { useTranslation } from 'next-i18next';
import { useUser } from '@smart-signer/lib/auth/use-user';
import {
  getAccountNotifications,
  getCommunity,
  getListCommunityRoles,
  getSubscribers,
  getSubscriptions
} from '@transaction/lib/bridge';
import { getDefaultProps } from '@/blog/lib/get-translations';
import { useSetRoleMutation } from '@/blog/components/hooks/use-set-role-mutations';

const roles = [
  { name: 'owner', value: 6 },
  { name: 'admin', value: 5 },
  { name: 'mod', value: 4 },
  { name: 'member', value: 3 },
  { name: 'guest', value: 2 },
  { name: 'muted', value: 1 }
];

const RolesPage: FC = () => {
  const router = useRouter();
  const { user } = useUser();
  const [client, setClient] = useState(false);
  const { t } = useTranslation('common_blog');

  useEffect(() => {
    setClient(true);
  }, []);

  const tag = router.query.param as string;

  const {
    data: rolesData,
    isLoading: rolesIsLoading,
    isError: rolesIsError
  } = useQuery(['rolesList', tag], () => getListCommunityRoles(tag), { enabled: Boolean(tag) });

  const {
    data: mySubsData,
    isLoading: mySubsIsLoading,
    isError: mySubsIsError
  } = useQuery(['subscriptions', user?.username], () => getSubscriptions(user.username), {
    enabled: Boolean(user?.username)
  });

  const {
    data: communityData,
    isLoading: communityDataIsLoading,
    isError: communityIsError
  } = useQuery(['community', tag, ''], () => getCommunity(tag, user.username), { enabled: !!tag });

  const {
    data: subsData,
    isLoading: subsIsLoading,
    isError: subsIsError
  } = useQuery(['subscribers', tag], () => getSubscribers(tag), { enabled: !!tag });

  const {
    isLoading: notificationIsLoading,
    isError: notificationIsError,
    data: notificationData
  } = useQuery(['AccountNotification', tag], () => getAccountNotifications(tag), { enabled: !!tag });

  const isLoading =
    mySubsIsLoading || communityDataIsLoading || subsIsLoading || notificationIsLoading || rolesIsLoading;
  const isError = mySubsIsError || communityIsError || subsIsError || notificationIsError || rolesIsError;
  const setRoleMutation = useSetRoleMutation();

  const userRole = rolesData?.find((e) => e[0] === user.username);
  const roleValue = userRole
    ? (() => {
        const role = roles.find((e) => e.name === userRole[1]);
        return role ? { value: role.value, role: role.name, name: userRole[0], title: userRole[2] } : null;
      })()
    : null;
  const rolesValue = rolesData?.map((e) => {
    const role = roles.find((r) => r.name === e[1]);
    return role ? { value: role.value, role: role.name, name: e[0], title: e[2] } : null;
  });

  if (isLoading) return <Loading loading={isLoading} />;
  if (isError) return <CustomError />;

  return client ? (
    <div className="container mx-auto max-w-screen-2xl flex-grow px-4 pb-2">
      <div className="grid grid-cols-12 md:gap-4">
        <div className="hidden md:col-span-3 md:flex xl:col-span-2">
          {user?.isLoggedIn ? (
            <CommunitiesMybar data={mySubsData} username={user.username} />
          ) : (
            <CommunitiesSidebar />
          )}
        </div>
        <div className="col-span-12 md:col-span-9 xl:col-span-8">
          <div data-testid="card-explore-hive-mobile" className=" md:col-span-10 md:flex xl:hidden">
            {communityData && subsData && (
              <CommunitySimpleDescription
                data={communityData}
                subs={subsData}
                username={tag || ' '}
                notificationData={notificationData}
              />
            )}
          </div>
          <div>
            <div className="mx-2 text-lg xl:mt-4">
              <Link className="text-destructive" href={`/trending/${communityData?.name}`}>
                {communityData?.title}
              </Link>
            </div>
            <div className="col-span-12 mb-5 flex flex-col md:col-span-10 lg:col-span-8">
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
                                  <AddRole user={roleValue} community={tag} targetedUser={e}>
                                    <span className="cursor-pointer text-destructive">{e.role}</span>
                                  </AddRole>
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
                  {roleValue && roleValue.value >= 3 && (
                    <AddRole user={roleValue} community={tag}>
                      <Button variant="outlineRed" className="m-10 mx-0 mt-4 font-normal" size="xs">
                        {t('communities.add_user')}
                      </Button>
                    </AddRole>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div data-testid="card-explore-hive-desktop" className="hidden xl:col-span-2 xl:flex">
          {communityData && subsData && (
            <CommunityDescription
              data={communityData}
              subs={subsData}
              notificationData={notificationData}
              username={tag}
            />
          )}
        </div>
      </div>
    </div>
  ) : (
    <Loading loading />
  );
};

export default RolesPage;

export const getServerSideProps: GetServerSideProps = getDefaultProps;
