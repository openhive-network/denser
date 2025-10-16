const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      <ul>
        <li>Posts</li>
        <li>Comments</li>
        <li>Payout</li>
      </ul>
      {children}
    </div>
  );
};
export default Layout;
