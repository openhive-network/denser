import { dateToRelative } from "@/lib/utils"

const Time = (props) => {
  return <span>{dateToRelative(props.time)}</span>
}

export default Time
