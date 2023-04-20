import CommentList from "@/components/comment-list"
import ProfileLayout from "@/components/common/profile-layout"
import { useSiteParams } from '@/components/hooks/use-site-params';
import { getAccountPosts } from '@/lib/bridge';
import { useQuery } from '@tanstack/react-query';

export default function UserReplies() {
  const { username } = useSiteParams()
  const { isLoading, error, data } =useQuery(
    ["accountReplies", username, "replies"],
    () => getAccountPosts("replies", username, "hive.blog"),
    { enabled: !!username }
  )

  if (isLoading) return <p>Loading...</p>

  return (
    <ProfileLayout>
    <div className="flex flex-col">
      <CommentList data={data} />
    </div>
    </ProfileLayout>
  )
}

// UserReplies.getLayout = function getLayout(page) {
//   return (
//     <Layout>
//       <LayoutProfile>{page}</LayoutProfile>
//     </Layout>
//   )
// }

// export async function getServerSideProps(context) {
//   const username = String(context.params?.param).slice(1);
//   const sort = "replies";
//   const queryClient = new QueryClient()
//
//   await queryClient.prefetchQuery(["accountReplies", username], () =>
//     getAccountPosts(sort, username, "hive.blog")
//   )
//
//   return {
//     props: {
//       dehydratedState: dehydrate(queryClient),
//     },
//   }
// }
