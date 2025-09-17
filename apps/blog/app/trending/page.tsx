export default function TrendingPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Trending Posts</h1>
      <div className="space-y-4">
        <div className="p-4 border rounded-lg bg-white">
          <h2 className="text-xl font-semibold">Sample Post 1</h2>
          <p className="text-gray-600">This is a sample trending post content.</p>
        </div>
        <div className="p-4 border rounded-lg bg-white">
          <h2 className="text-xl font-semibold">Sample Post 2</h2>
          <p className="text-gray-600">This is another sample trending post content.</p>
        </div>
      </div>
    </div>
  );
}
