import { NextRequest, NextResponse } from 'next/server';
import {
  fetchSidechainCuratorRewards,
  getSidechainRewardsConfig,
  isSidechainRewardsConfigured
} from '@ui/lib/sidechain-rewards';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const searchParams = req.nextUrl.searchParams;
  const author = (searchParams.get('author') ?? '').trim();
  const permlink = (searchParams.get('permlink') ?? '').trim();

  if (!author || !permlink) {
    return NextResponse.json({ error: 'author and permlink are required' }, { status: 400 });
  }

  const config = getSidechainRewardsConfig();
  if (!isSidechainRewardsConfigured(config)) {
    return NextResponse.json(
      { curators: [] },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store'
        }
      }
    );
  }

  try {
    const curators = await fetchSidechainCuratorRewards(author, permlink, config);
    return NextResponse.json(
      { curators },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store'
        }
      }
    );
  } catch (_error) {
    return NextResponse.json(
      { curators: [] },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store'
        }
      }
    );
  }
}
