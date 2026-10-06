import { PieChart, Pie } from 'recharts';

const CHART_DATA = [{ name: '', value: 1 }];

/** The ring around the avatar in the site header showing the share of Resource Credits left. */
export default function RcRingChart({ angle }: { angle: number }) {
  return (
    <PieChart width={50} height={50}>
      <Pie
        data={CHART_DATA}
        cx={20}
        cy={20}
        startAngle={90}
        endAngle={-angle + 90}
        innerRadius={17}
        outerRadius={23}
        fill="#0088FE"
        paddingAngle={0}
        dataKey="value"
      ></Pie>
    </PieChart>
  );
}
