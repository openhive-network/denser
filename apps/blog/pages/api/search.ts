import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const url = `${process.env.ELASTIC_SEARCH_API_URL}`;
  const authorization = `${process.env.ELASTIC_SEARCH_API_KEY}`;
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
        body: JSON.stringify(request.body)
      }
    });
    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    if (error instanceof Error) return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
