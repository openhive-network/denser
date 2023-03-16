import { dateToShow } from "@/lib/utils"

const Date = (props) => {
  return <>{dateToShow(props.time)}</>
}

export default Date
