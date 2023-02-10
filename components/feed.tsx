'use client'
import PostListItem from '@/components/post-list-item';
import { useEffect, useState } from 'react';
import { getPostsRanked2 } from '@/lib/bridge';


export default function Feed({ filter }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const data = await getPostsRanked2(filter)
      setData(data);
    }

    fetchData()
      .catch(console.error);
  }, [filter])

  return (
    <div>
      {data.length === 0 ? (
        <p className="p-4">No posts yet</p>
      ) : (
        <ul>
          {data.map((post) => (
            <li key={post.author}>
              <PostListItem post={post} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
