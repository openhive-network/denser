import { notFound, redirect } from 'next/navigation';
import { getLogger } from '@ui/lib/logging';
import { siteConfig } from '@ui/config/site';
import { withBasePath } from '@/blog/utils/PathUtils';
import { useTranslation } from '../../../i18n/server';

const logger = getLogger('app');

interface InteractionPageProps {
  params: {
    uid: string;
  };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function InteractionPage({ params, searchParams }: InteractionPageProps) {
  // Check if OIDC is enabled, if not return 404
  if (!siteConfig.oidcEnabled) {
    notFound();
  }

  // Initialize translations for this server component
  const { t } = await useTranslation('common_blog');

  // Handle redirect logic if needed
  const redirectTo = searchParams?.redirectTo as string;
  if (redirectTo) {
    redirect(withBasePath(redirectTo));
  }

  return (
    <div
      className="mx-2 flex flex-col gap-24 pt-16 sm:flex-row
        sm:justify-around sm:gap-0"
    >
      <div className="flex flex-col gap-3 sm:mr-4 sm:gap-8">
        <div className="text-lg font-bold sm:text-3xl">Interaction</div>
      </div>
    </div>
  );
}
