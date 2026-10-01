import { redirect, notFound } from 'next/navigation';

export default async function Page(props: { params: Promise<{ param: string }> }) {
  const params = await props.params;
  const param = decodeURIComponent(params.param);
  if (!param.startsWith('@')) {
    notFound();
  }
  redirect(`/${param}/transfers`);
}
