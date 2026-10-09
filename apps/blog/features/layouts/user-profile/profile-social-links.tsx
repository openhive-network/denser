'use client';

import { useCallback, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Cloud, Instagram, KeyRound, MessageCircle, Send, Twitter, Youtube } from 'lucide-react';
import { Link } from '@hive/ui';
import { useTranslation } from '@/blog/i18n/client';
import { getLogger } from '@ui/lib/logging';
import type { SocialKey, SocialLink } from './lib/social-links';

const logger = getLogger('profile-social-links');

const COPIED_RESET_MS = 1500;

const SOCIAL_ICONS: Record<SocialKey, LucideIcon> = {
  x: Twitter,
  ig: Instagram,
  yt: Youtube,
  tg: Send,
  bsky: Cloud,
  dc: MessageCircle,
  nostr: KeyRound
};

const ITEM_CLASS =
  'flex items-center gap-1 rounded-full border border-dashed border-white/40 px-1.5 py-0.5 text-xs text-white/80 transition-colors hover:text-white';

function CopyableHandle({ link, title }: { link: SocialLink; title: string }) {
  const { t } = useTranslation('common_blog');
  const [copied, setCopied] = useState(false);
  const Icon = SOCIAL_ICONS[link.key];

  const handleCopy = useCallback(() => {
    navigator.clipboard
      .writeText(link.handle)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), COPIED_RESET_MS);
      })
      .catch((error: unknown) => logger.error(error, 'copying social handle failed'));
  }, [link.handle]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={title}
      aria-label={title}
      className={ITEM_CLASS}
      data-testid={`profile-social-${link.key}`}
      data-verified="false"
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="max-w-[8rem] truncate">{copied ? t('user_profile.social.copied') : link.handle}</span>
    </button>
  );
}

/** Social handles claimed by the account owner; every item is labelled as unverified. */
const ProfileSocialLinks = ({ links }: { links: SocialLink[] }) => {
  const { t } = useTranslation('common_blog');

  return (
    <>
      {links.map((link) => {
        const title = t('user_profile.social.unverified_title', {
          platform: t(`user_profile.social.platforms.${link.key}`),
          handle: link.handle
        });
        if (link.url === null) return <CopyableHandle key={link.key} link={link} title={title} />;
        const Icon = SOCIAL_ICONS[link.key];
        return (
          <Link
            key={link.key}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            title={title}
            aria-label={title}
            className={ITEM_CLASS}
            data-testid={`profile-social-${link.key}`}
            data-verified="false"
          >
            <Icon className="h-4 w-4" />
          </Link>
        );
      })}
    </>
  );
};

export default ProfileSocialLinks;
