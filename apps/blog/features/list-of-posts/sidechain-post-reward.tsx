'use client';

import { memo, useEffect, useState } from 'react';
import { Icons } from '@ui/components/icons';
import { cn } from '@ui/lib/utils';
import {
  getSidechainRewardsConfig,
  isSidechainRewardsConfigured
} from '@ui/lib/sidechain-rewards';
import { useSidechainPostReward } from './hooks/use-sidechain-post-reward';

interface SidechainPostRewardProps {
  author: string;
  permlink: string;
  className?: string;
  dataTestId?: string;
}

const trimDecimals = (value: number, precision: number): string => {
  const boundedPrecision = Math.min(Math.max(precision, 0), 8);
  const fixed = value.toFixed(boundedPrecision);
  return fixed.replace(/\.?0+$/, '') || '0';
};

const SidechainLogo = ({ logoUrl, logoAlt }: { logoUrl: string; logoAlt: string }) => {
  const [imageFailed, setImageFailed] = useState(false);

  if (logoUrl && !imageFailed) {
    return (
      <img
        src={logoUrl}
        alt={logoAlt}
        className="he-sidechain-logo h-5 w-5 object-contain"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return <Icons.hive className="he-sidechain-logo h-5 w-5" />;
};

const SidechainPostReward = ({
  author,
  permlink,
  className,
  dataTestId = 'sidechain-post-reward'
}: SidechainPostRewardProps) => {
  const [mounted, setMounted] = useState(false);
  const config = getSidechainRewardsConfig();
  const isConfigured = isSidechainRewardsConfigured(config);
  const { data } = useSidechainPostReward(author, permlink);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isConfigured) {
    return null;
  }

  const reward = data ?? {
    token: config.token,
    amount: 0,
    precision: 0
  };

  return (
    <div
      className={cn(
        'he-sidechain-reward he-sidechain-post-reward inline-flex items-center gap-1 text-xs font-semibold',
        className
      )}
      style={config.textColor ? { color: config.textColor } : undefined}
      data-testid={dataTestId}
    >
      <SidechainLogo logoUrl={config.logoUrl} logoAlt={config.logoAlt} />
      <span className="he-sidechain-amount">{trimDecimals(reward.amount, reward.precision)}</span>
      <span className="he-sidechain-token">{reward.token}</span>
    </div>
  );
};

export default memo(SidechainPostReward);
