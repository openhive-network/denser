interface Props {
  username: string
  size: string
}

function UserAvatar({ username, size }: Props) {
  const imgSize =
    size === "xLarge"
      ? "large"
      : size === "normal" || size === "small"
      ? "small"
      : "medium"
  const imageSrc = `https://images.hive.blog/u/${username}/avatar/${imgSize}`

  const boxSize = size === "large" ? "24" : size === "medium" ? "16" : "12"

  return (
    <span
      className={`mr-2 block h-12 w-12 rounded-full bg-slate-500 bg-cover bg-center bg-no-repeat`}
      style={{ backgroundImage: `url(${imageSrc})` }}
    />
  )
}

export default UserAvatar
