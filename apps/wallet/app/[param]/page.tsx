import { redirect, notFound } from 'next/navigation';

export default function Page({ params }: { params: { param: string } }) {
  if (!params.param.startsWith('@')) {
    notFound();
  }
  redirect(`/${params.param}/transfers`);
}
