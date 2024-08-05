import CommunitiesMybar from '@/blog/components/communities-mybar';
import CommunitiesSidebar from '@/blog/components/communities-sidebar';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { FC, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getAccountNotifications,
  getCommunity,
  getListCommunityRoles,
  getSubscribers,
  getSubscriptions
} from '@transaction/lib/bridge';
import Loading from '@ui/components/loading';
import CustomError from '@/blog/components/custom-error';
import CommunityDescription from '@/blog/components/community-description';
import { GetServerSideProps } from 'next';
import { getServerSidePropsDefault } from '@/blog/lib/get-translations';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ui/components/table';
import Link from 'next/link';
import CommunitySimpleDescription from '@/blog/components/community-simple-description';

const RolesPage: FC = () => {
  const { user } = useUser();
  const [client, setClient] = useState(false);
  useEffect(() => {
    setClient(true);
  }, []);
  const tag = 'hive-160391';
  const {
    data: rolesData,
    isLoading: rolesIsLoading,
    isError: rolesIsError
  } = useQuery(['rolesList', tag], () => getListCommunityRoles(tag), {
    enabled: Boolean(tag)
  });

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
  } = useQuery(['community', tag, ''], () => getCommunity(tag, user.username), {
    enabled: !!tag
  });
  const {
    data: subsData,
    isLoading: subsIsLoading,
    isError: subsIsError
  } = useQuery(['subscribers', tag], () => getSubscribers(tag), {
    enabled: !!tag
  });
  const {
    isLoading: notificationIsLoading,
    isError: notificationIsError,
    data: notificationData
  } = useQuery(['AccountNotification', tag], () => getAccountNotifications(tag), {
    enabled: !!tag
  });

  const isLoading =
    (mySubsData && mySubsIsLoading) ||
    (communityDataIsLoading && communityData) ||
    (subsIsLoading && !!subsData) ||
    (notificationIsLoading && notificationData) ||
    (rolesIsLoading && rolesData);

  const isError = mySubsIsError || communityIsError || subsIsError || notificationIsError || rolesIsError;
  if (isLoading) return <Loading loading={isLoading} />;
  if (isError) return <CustomError />;

  return client ? (
    // <div className="flex flex-col px-4 sm:grid sm:grid-cols-12 sm:flex-row md:gap-4">

    //   <div className="xl:col-span-8">
    //     <div>
    //       <div className="mx-2 my-4 text-lg">
    //         <Link className="text-destructive" href={`/trending/${communityData?.name}`}>
    //           {communityData?.title}
    //         </Link>
    //       </div>
    //       <div className="m-2 w-full bg-background px-8 py-6">
    //         <h2 className="mb-1 text-2xl">User roles</h2>
    //         <Table className="w-full border-[1px] border-solid border-secondary">
    //           <TableHeader className="text-">
    //             <TableRow className="bg-secondary">
    //               <TableHead className="px-2">Account</TableHead>
    //               <TableHead className="px-2">Role</TableHead>
    //               <TableHead className="px-2">Title</TableHead>
    //             </TableRow>
    //           </TableHeader>
    //           <TableBody>
    //             {rolesData?.map((e) => (
    //               <TableRow key={e[0]}>
    //                 <TableCell className="p-2">
    //                   <Link href={`/@${e[0]}`} className="text-destructive">
    //                     @{e[0]}
    //                   </Link>
    //                 </TableCell>
    //                 <TableCell className="border-x-[1px] border-solid border-secondary p-2">{e[1]}</TableCell>
    //                 <TableCell className="p-2">{e[2]}</TableCell>
    //               </TableRow>
    //             ))}
    //           </TableBody>
    //         </Table>
    //       </div>
    //     </div>
    //   </div>
    //     </div>
    //   ) : null}
    // </div>
    <div className="container mx-auto max-w-screen-2xl flex-grow px-4 pb-2">
      <div className="grid grid-cols-12 md:gap-4">
        <div className="hidden md:col-span-3 md:flex xl:col-span-2">
          {user?.isLoggedIn ? (
            <CommunitiesMybar data={mySubsData} username={user.username} />
          ) : (
            <CommunitiesSidebar />
          )}{' '}
        </div>
        <div className="col-span-12 md:col-span-9 xl:col-span-8">
          <div data-testid="card-explore-hive-mobile" className=" md:col-span-10 md:flex xl:hidden">
            {communityData && subsData ? (
              <CommunitySimpleDescription
                data={communityData}
                subs={subsData}
                username={tag ? tag : ' '}
                notificationData={notificationData}
              />
            ) : null}
          </div>
          <div>
            <div className="mx-2 my-4 text-lg">
              <Link className="text-destructive" href={`/trending/${communityData?.name}`}>
                {communityData?.title}
              </Link>
            </div>
            <div className="col-span-12 mb-5 flex flex-col md:col-span-10 lg:col-span-8">
              <div className="my-4 flex w-full items-center justify-between" translate="no">
                <div className="m-2 w-full bg-background px-8 py-6">
                  <h2 className="mb-1 text-2xl">User roles</h2>
                  <Table className="w-full border-[1px] border-solid border-secondary">
                    <TableHeader className="text-">
                      <TableRow className="bg-secondary">
                        <TableHead className="px-2">Account</TableHead>
                        <TableHead className="px-2">Role</TableHead>
                        <TableHead className="px-2">Title</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rolesData?.map((e) => (
                        <TableRow key={e[0]}>
                          <TableCell className="p-2">
                            <Link href={`/@${e[0]}`} className="text-destructive">
                              @{e[0]}
                            </Link>
                          </TableCell>
                          <TableCell className="border-x-[1px] border-solid border-secondary p-2">
                            {e[1]}
                          </TableCell>
                          <TableCell className="p-2">{e[2]}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div data-testid="card-explore-hive-desktop" className="hidden xl:col-span-2 xl:flex">
          {communityData && subsData ? (
            <CommunityDescription
              data={communityData}
              subs={subsData}
              notificationData={notificationData}
              username={tag}
            />
          ) : null}
        </div>
      </div>
    </div>
  ) : (
    <Loading loading />
  );
};
export default RolesPage;

export const getServerSideProps: GetServerSideProps = getServerSidePropsDefault;
