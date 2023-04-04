export default function BadgeListItem({ title, url }) {
  return (
    <div className="w-24">
      <img src={url} alt={title} />
    </div>
  )
}
