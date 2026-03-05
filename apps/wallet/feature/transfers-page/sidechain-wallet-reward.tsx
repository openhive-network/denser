'use client';

import { memo, useEffect, useState } from 'react';
import { Icons } from '@ui/components/icons';
import { cn } from '@ui/lib/utils';
import {
  getSidechainRewardsConfig,
  isSidechainRewardsConfigured
} from '@ui/lib/sidechain-rewards';
import { useSidechainWalletReward } from './hooks/use-sidechain-wallet-reward';

interface SidechainWalletRewardProps {
  account: string;
  balanceType?: 'pending' | 'liquid' | 'staked' | 'total';
  showTokenSymbol?: boolean;
  showLogo?: boolean;
  className?: string;
  dataTestId?: string;
}

const trimDecimals = (value: number, precision: number): string => {
  const boundedPrecision = Math.min(Math.max(precision, 0), 8);
  const fixed = value.toFixed(boundedPrecision);
  const trimmed = fixed.replace(/\.?0+$/, '') || '0';
  const [integerPart, decimalPart] = trimmed.split('.');
  const withCommas = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decimalPart ? `${withCommas}.${decimalPart}` : withCommas;
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

const SidechainWalletReward = ({
  account,
  balanceType = 'pending',
  showTokenSymbol = true,
  showLogo = true,
  className,
  dataTestId = 'sidechain-wallet-reward'
}: SidechainWalletRewardProps) => {
  const [mounted, setMounted] = useState(false);
  const config = getSidechainRewardsConfig();
  const isConfigured = isSidechainRewardsConfigured(config);
  const { data } = useSidechainWalletReward(account);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isConfigured) {
    return null;
  }

  const amount =
    balanceType === 'liquid'
      ? (data?.liquidAmount ?? 0)
      : balanceType === 'staked'
        ? (data?.stakedAmount ?? 0)
        : balanceType === 'total'
          ? (data?.liquidAmount ?? 0) + (data?.stakedAmount ?? 0)
          : (data?.pendingAmount ?? 0);
  const precision = data?.precision ?? 3;
  const token = data?.token ?? config.token;

  return (
    <div
      className={cn(
        'he-sidechain-reward he-sidechain-wallet-reward inline-flex items-center gap-1 text-sm font-semibold',
        className
      )}
      style={config.textColor ? { color: config.textColor } : undefined}
      data-testid={dataTestId}
    >
      {showLogo ? <SidechainLogo logoUrl={config.logoUrl} logoAlt={config.logoAlt} /> : null}
      <span className="he-sidechain-amount">{trimDecimals(amount, precision)}</span>
      {showTokenSymbol ? <span className="he-sidechain-token">{token}</span> : null}
    </div>
  );
};

export default memo(SidechainWalletReward);
