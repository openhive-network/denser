import SubNavigation from '@/components/sub-navigation';

interface UserProfileLayoutProps {
  children: React.ReactNode
  params: {
    username: string
  }
}

export default function UserPostsLayout({
  children,
  params,
}: UserProfileLayoutProps) {
  return (
    <main>
      <SubNavigation username={params.username} />
      {children}
    </main>
  )
}
