import { NextRequest, NextResponse } from 'next/server';
import { getDiscussion } from '@transaction/lib/bridge-api';
import { sorter, SortOrder } from '@/blog/lib/sorter';
import { Entry } from '@transaction/lib/extended-hive.chain';

// In-memory cache for discussion data
// Key: "author/permlink", Value: { data, timestamp }
const discussionCache = new Map<string, { data: Entry[]; timestamp: number }>();
const CACHE_TTL = 60000; // 60 seconds

interface CommentResponse {
  comments: Entry[];
  totalCount: number;
  nextCursor: { author: string; permlink: string } | null;
}

async function getCachedDiscussion(author: string, permlink: string): Promise<Entry[]> {
  const cacheKey = `${author}/${permlink}`;
  const cached = discussionCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Fetch fresh data
  const discussionData = await getDiscussion(author, permlink);

  if (!discussionData) {
    return [];
  }

  // Convert Record<string, Entry> to Entry[] and filter out the root post
  const comments = Object.values(discussionData).filter(
    (entry) => entry.author !== author || entry.permlink !== permlink
  );

  // Cache the result
  discussionCache.set(cacheKey, { data: comments, timestamp: now });

  return comments;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ author: string; permlink: string }> }
): Promise<NextResponse<CommentResponse | { error: string }>> {
  try {
    const { author, permlink } = await params;
    const searchParams = request.nextUrl.searchParams;

    const sort = (searchParams.get('sort') as SortOrder) || SortOrder.new;
    const afterAuthor = searchParams.get('after_author') || '';
    const afterPermlink = searchParams.get('after_permlink') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    // Get cached or fresh discussion
    const comments = await getCachedDiscussion(author, permlink);

    if (comments.length === 0) {
      return NextResponse.json({
        comments: [],
        totalCount: 0,
        nextCursor: null
      });
    }

    // Make a copy to avoid mutating cached data
    const sortedComments = [...comments];

    // Sort comments
    sorter(sortedComments, sort);

    // Find cursor position
    let startIndex = 0;
    if (afterAuthor && afterPermlink) {
      const cursorIndex = sortedComments.findIndex(
        (c) => c.author === afterAuthor && c.permlink === afterPermlink
      );
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    // Slice to get the page
    const slice = sortedComments.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < sortedComments.length;

    // Build next cursor
    const nextCursor = hasMore && slice.length > 0
      ? { author: slice[slice.length - 1].author, permlink: slice[slice.length - 1].permlink }
      : null;

    return NextResponse.json({
      comments: slice,
      totalCount: sortedComments.length,
      nextCursor
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}
