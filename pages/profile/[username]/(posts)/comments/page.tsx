import CommentsProvider from "@/components/comments-provider"
import SubNavigation from "@/components/sub-navigation"
import { useRouter } from 'next/router';

export default async function CommentsSubPage() {
  const router = useRouter()
  const { username } = router.query
  return (
    <main>
      <SubNavigation username={username} />
      <CommentsProvider />
    </main>
  )
}
