'use client';

import { useTranslation } from '@/blog/i18n/client';

const UNAVAILABLE_PLACEHOLDER = '—';

/** A profile follow count; `undefined` means the count could not be loaded, which is never shown as 0. */
const FollowCount = ({ value }: { value: number | undefined }) => {
  const { t } = useTranslation('common_blog');

  if (value === undefined) {
    const unavailable = t('user_profile.lists.count_unavailable');
    return (
      <span
        className="text-lg font-semibold sm:text-xl"
        title={unavailable}
        aria-label={unavailable}
        data-testid="profile-follow-count-unavailable"
      >
        {UNAVAILABLE_PLACEHOLDER}
      </span>
    );
  }
  return <span className="text-lg font-semibold sm:text-xl">{value}</span>;
};

export default FollowCount;
