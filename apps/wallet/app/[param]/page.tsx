import { redirect, notFound } from 'next/navigation';

export default async function Page({ params }: { params: Promise<{ param: string }> }) {
  const { param: rawParam } = await params;
  const param = decodeURIComponent(rawParam);
  if (!param.startsWith('@')) {
    notFound();
  }
  redirect(`/${param}/transfers`);
}
