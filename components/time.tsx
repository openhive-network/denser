import { dateToRelative } from "@/lib/utils"

const Time = (props) => {
  return <p>{dateToRelative(props.time)}</p>
}

export default Time
