import { Layout } from '@/components/layout';
import LayoutProfile from '@/components/layout-profile';
import { dehydrate, QueryClient, useQuery } from '@tanstack/react-query';
import { getAccountPosts } from '@/lib/bridge';
import { useRouter } from 'next/router';
import PostActivities from '@/components/post-activities';

export default function UserPosts() {
  const router = useRouter()
  const username =
    typeof router.query?.username === "string" ? router.query.username : ""
  const { isLoading, error, data } = useQuery({
    queryKey: ["accountPosts", username],
    queryFn: () => getAccountPosts("posts", username, "hive.blog"),
  })

  if (isLoading) return <p>Loading...</p>

  return (
    <div className="flex flex-col">
      <PostActivities data={data} />
    </div>
  )
}


UserPosts.getLayout = function getLayout(page) {
  return (
    <Layout>
      <LayoutProfile>{page}</LayoutProfile>
    </Layout>
  )
}

export async function getServerSideProps(context) {
  const username = context.params?.username as string
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery(["accountPosts", username], () =>
    getAccountPosts("posts", username, "hive.blog")
  )

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
  }
}
