import Link from "next/link";

const BadgeListItem = ({
  title,
  url,
  username,
}: {
  title: string;
  url: string;
  username?: string;
}) => {
  const parts = url.split("/");
  const href = parts[parts.length - 2];
  return (
    <div className=" w-16">
      <Link
        href={
          username
            ? `https://hivebuzz.me/@${username}`
            : `https://peakd.com/b/${href}`
        }
        target="_blank"
      >
        <img src={url} alt={title} title={title}/>
      </Link>
    </div>
  );
};

export default BadgeListItem;
