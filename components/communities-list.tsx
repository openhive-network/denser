import CommunitiesListItem from "@/components/communities-list-item"

export default function CommunitiesList({ data }) {
  return (
    <ul>
      {data.map((community) => (
        <CommunitiesListItem community={community} key={community.name} />
      ))}
    </ul>
  )
}
