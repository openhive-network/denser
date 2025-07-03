import Link from 'next/link';

function VotersItem({ username, hp, proxy }: { username: string; hp: number; proxy: number }) {
  return (
    <div className="flex flex-col gap-1" data-testid="vote-list-item">
      <Link
        href={`/@${username}`}
        target="_blank"
        className="text-red-500"
        data-testid="proposal-voter-link-dialog"
      >
        {username}
      </Link>
      <div className="text-slate-500" data-testid="voter-values-dialog">
        <span>{hp + ' HP'}</span>
        <span>{proxy > 0 ? ' + ' + proxy + ' Proxy' : null}</span>
      </div>
    </div>
  );
}
export default VotersItem;
