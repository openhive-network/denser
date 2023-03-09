import PostsProvider from "@/components/posts-provider"
import SubNavigation from "@/components/sub-navigation"
import { useRouter } from 'next/router';

export default async function PayoutsSubPage() {
  const router = useRouter()
  const { username } = router.query
  return (
    <main>
      <SubNavigation username={username} />
      <PostsProvider />
    </main>
  )
}
