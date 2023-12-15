import { type NextRequest, NextResponse } from 'next/server';
import { getLogger } from "@hive/ui/lib/logging";
import { oidc } from '@/auth/lib/oidc';
import { NextApiRequest, NextApiResponse } from 'next';
import * as http from "node:http";

const logger = getLogger('app');

export async function GET(
      req: NextApiRequest,
      { params }: { params: { uid: string } }
    ): Promise<NextResponse> {

  // const res = new NextResponse('Hello, Next.js!', { status: 200 });
  const res = new NextResponse('bamboo', { status: 200 });

  try {
    const {
      uid, prompt, params, session,
    } = await oidc.interactionDetails(req, res);

    logger.info({
      uid, prompt, params, session,
    });

    // const client = await oidc.Client.find(params.client_id);
  } catch (err) {
    return new NextResponse('error', { status: 500 })
  }

  return res;
}
