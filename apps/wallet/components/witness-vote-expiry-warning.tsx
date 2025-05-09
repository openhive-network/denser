import moment from 'moment';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import HoverClickTooltip from './hover-click-tooltip';

const WitnessVoteExpiryWarning = ({ expirationTime }: { expirationTime?: string }) => {
  const { t } = useTranslation('common_wallet');
  const governanceVoteExpirationTime =
    expirationTime ??
    new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('.')[0];

  const now = moment();
  const expiryDate = moment(`${governanceVoteExpirationTime}Z`);
  const expiryYear = parseInt(expiryDate.format('YYYY'));
  const expiryDiff = expiryDate.diff(now, 'months');

  if (expiryDiff > 3 || !expiryDiff || !expiryDate) {
    return null;
  }
  const showWarning = expiryYear >= 2016 && expiryDiff > 0 && expiryDiff <= 3;
  const showExpired = expiryYear >= 2016 && expiryDiff <= 0;
  const showVoteForWitnesses = expiryYear < 2016;

  return (
    <HoverClickTooltip
      triggerChildren={'!'}
      buttonStyle={`absolute bottom-auto left-auto right-9 top-1.5 z-50 inline-block -translate-y-1/2 translate-x-2/4 rotate-0 skew-x-0 skew-y-0 scale-x-100 scale-y-100 whitespace-nowrap rounded-full bg-destructive px-2 py-1 text-center align-baseline text-xs font-bold leading-none text-white ${showWarning || showExpired || showVoteForWitnesses ? 'block' : 'hidden'}`}
      contentStyle="w-72"
    >
      <>
        {expiryYear >= 2016 && expiryDiff > 0 && (
          <span>
            {t('profile.governanceExpiryWarning', {
              date: expiryDate.format('ll'),
              duration: '1 year'
            })}
            <Link className="text-destructive" href="/~witnesses">
              update your Witness votes
            </Link>
            {t('profile.to_reset')}
          </span>
        )}
        {expiryYear >= 2016 && expiryDiff <= 0 && (
          <span>
            {t('profile.governanceExpired', {
              date: expiryDate.format('ll'),
              duration: '1 year'
            })}
            <Link className="text-destructive" href="/~witnesses">
              update your Witness votes
            </Link>
            {t('profile.to_reset')}
          </span>
        )}
        {expiryYear < 2016 && (
          <span>
            {t('profile.pleaseVoteForWitnesses')}
            <Link className="text-destructive" href="/~witnesses">
              Witnesses page
            </Link>
          </span>
        )}
      </>
    </HoverClickTooltip>
  );
};

export default WitnessVoteExpiryWarning;
