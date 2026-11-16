import { Link } from '@hive/ui';
import { Icons } from '@hive/ui/components/icons';
import { useTranslation } from '@/wallet/i18n/client';
import { getExternalLink } from '@/wallet/lib/utils';
import { parseWitnessSite } from '@/wallet/lib/witness-row';

const LINK_CLASS_NAME = 'inline-flex min-w-0 items-center gap-1 font-semibold hover:text-red-400 dark:hover:text-red-400';

/**
 * A witness's URL, named by where it goes: "Announcement" for a post on a Hive front end, opened on
 * our blog, or the site's host and path in a new tab. An unsafe or invalid URL is not linked.
 */
export default function WitnessSiteLink({ url }: { url: string }) {
  const { t } = useTranslation('common_wallet');
  const site = parseWitnessSite(url);

  if (!site) return <>({t('witnesses_page.no_url_provided')})</>;

  if (site.kind === 'announcement')
    return (
      <Link href={getExternalLink(site.postPath)} title={url} className={LINK_CLASS_NAME}>
        <span>{t('witnesses_page.announcement')}</span>
        <Icons.forward className="h-3 w-3 shrink-0 text-red-600 dark:text-red-500" />
      </Link>
    );

  return (
    <Link href={site.href} target="_blank" rel="noreferrer noopener" title={url} className={LINK_CLASS_NAME}>
      <span className="truncate">{site.label}</span>
      <Icons.forward className="h-3 w-3 shrink-0 text-red-600 dark:text-red-500" />
    </Link>
  );
}
