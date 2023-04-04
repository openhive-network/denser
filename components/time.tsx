import { dateToRelative } from "@/lib/utils"

const Time = (props) => {
  return <>{dateToRelative(props.time)}</>
}

export default Time
