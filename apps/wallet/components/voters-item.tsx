import { Link } from '@hive/ui';
import { numberWithCommas } from '@hive/ui/lib/utils';

const formatHp = (value: number) => numberWithCommas(value.toFixed(2));

function VotersItem({
  username,
  hp,
  proxy,
  tabIndex,
  onFocus
}: {
  username: string;
  hp: number;
  proxy: number;
  tabIndex: number;
  onFocus: () => void;
}) {
  return (
    <li className="flex flex-col gap-1" data-testid="vote-list-item">
      <Link
        href={`/@${username}`}
        target="_blank"
        className="text-red-500"
        data-testid="proposal-voter-link-dialog"
        tabIndex={tabIndex}
        onFocus={onFocus}
      >
        {username}
      </Link>
      <div className="text-slate-500" data-testid="voter-values-dialog">
        <span>{formatHp(hp) + ' HP'}</span>
        <span>{proxy > 0 ? ' + ' + formatHp(proxy) + ' Proxy' : null}</span>
      </div>
    </li>
  );
}
export default VotersItem;
