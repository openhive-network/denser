import { redirect, notFound } from 'next/navigation';

export default function Page({ params }: { params: { param: string } }) {
  const param = decodeURIComponent(params.param);
  if (!param.startsWith('@')) {
    notFound();
  }
  redirect(`/${param}/transfers`);
}
