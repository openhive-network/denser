const BadgeListItem = ({ title, url }: { title: string; url: string }) => {
  return (
    <div className="w-24">
      <img src={url} alt={title} />
    </div>
  );
};

export default BadgeListItem;
