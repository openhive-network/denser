import Link from "next/link";

function VotersItem({
  username,
  hp,
  proxy,
}: {
  username: string;
  hp: number;
  proxy: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Link
        href={`http://localhost:3000/@${username}`}
        target="_blank"
        className="text-red-500"
      >
        {username}
      </Link>
      <div className="text-slate-500">
        <span>{hp + " HP"}</span>
        <span>{proxy > 0 ? " + " + proxy + " Proxy" : null}</span>
      </div>
    </div>
  );
}
export default VotersItem;
