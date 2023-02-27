import CommentsProvider from '@/components/comments-provider';

export default async function RepliesSubPage() {
  return (
    <div className="flex flex-col">
      <CommentsProvider />
    </div>
  )
}
