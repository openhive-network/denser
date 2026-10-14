import { numberWithCommas } from '@ui/lib/utils';
import { PieChart, Pie } from 'recharts';
import { useTranslation } from '@/wallet/i18n/client';

const chart = [{ name: '', value: 1 }];

const RCStats = ({
  current,
  max,
  title,
  angle,
  color,
  restoreTime,
  percentageValue
}: {
  current: string;
  max: string;
  title: string;
  angle: number;
  color: string;
  restoreTime: string;
  percentageValue: number;
}) => {
  const { t } = useTranslation('common_wallet');
  return (
    <div className="flex w-fit flex-col">
      <h4 className="text-center font-semibold">{title}</h4>
      <div className="flex justify-between gap-1">
        <span>{t('resource_credits.max')}</span>
        <span>{max}</span>
      </div>
      <div className="flex justify-between gap-1">
        <span>{t('resource_credits.current')}</span>
        <span>{current}</span>
      </div>
      <div className="flex items-center justify-center gap-2">
        <PieChart width={70} height={70}>
          <Pie
            data={chart}
            cx={30}
            cy={30}
            startAngle={90}
            endAngle={angle + 90}
            innerRadius={0}
            outerRadius={28.5}
            fill={color}
            paddingAngle={0}
            dataKey="value"
          ></Pie>
        </PieChart>
        <span>{`${percentageValue}%`}</span>
      </div>
      {!!restoreTime ? (
        <div className="flex flex-col justify-center">
          <span>{t('resource_credits.fully_restored_in')}</span>
          <span>{restoreTime}</span>
        </div>
      ) : null}
    </div>
  );
};

export default RCStats;
