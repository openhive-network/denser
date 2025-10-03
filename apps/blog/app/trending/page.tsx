export default function TrendingPage() {
  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold">Trending Posts</h1>
      <div className="space-y-4">
        <div className="rounded-lg border p-4">
          <h2 className="text-xl font-semibold">Sample Post 1</h2>
          <p>This is a sample trending post content.</p>
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="text-xl font-semibold">Sample Post 2</h2>
          <p>This is another sample trending post content.</p>
        </div>
      </div>
    </div>
  );
}
