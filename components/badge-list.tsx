import BadgeListItem from "@/components/badge-list-item"

export default function BadgeList({ data }) {
  return (
    <div className="grid grid-cols-8 gap-2">
      {data.map((badge) => (
        <BadgeListItem key={badge.id} title={badge.title} url={badge.url} />
      ))}
    </div>
  )
}
