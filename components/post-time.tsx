import { dateToRelative } from "@/lib/utils"

const PostTime = (props) => {
  return <p>{dateToRelative(props.time)}</p>
}

export default PostTime
