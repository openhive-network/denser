'use client';

import { useEffect } from 'react';
import { getCookie } from '@ui/lib/utils';
import { languages, defaultLocale, cookieName } from '@/wallet/i18n/settings';
import {
  getSidechainRewardsConfig,
  isSidechainRewardsConfigured
} from '@ui/lib/sidechain-rewards';

const rgbToHslTriplet = (r: number, g: number, b: number): string => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) {
      h = ((gn - bn) / delta) % 6;
    } else if (max === gn) {
      h = (bn - rn) / delta + 2;
    } else {
      h = (rn - gn) / delta + 4;
    }
  }

  h = Math.round(h * 60);
  if (h < 0) {
    h += 360;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return `${h} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const parseColorToHslTriplet = (value: string): string | null => {
  const temp = document.createElement('span');
  temp.style.color = value;
  temp.style.display = 'none';
  document.body.appendChild(temp);
  const resolved = getComputedStyle(temp).color;
  temp.remove();

  const match = resolved.match(
    /rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*[0-9.]+)?\s*\)/i
  );

  if (!match) {
    return null;
  }

  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);

  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
    return null;
  }

  return rgbToHslTriplet(r, g, b);
};

export default function ClientEffects() {
  // Set default locale cookie if missing or invalid
  useEffect(() => {
    const currentLocale = getCookie(cookieName);
    if (!currentLocale || !languages.includes(currentLocale)) {
      document.cookie = `${cookieName}=${defaultLocale}; path=/; SameSite=Lax`;
    }
  }, []);

  // Set document direction for RTL languages
  useEffect(() => {
    const locale = getCookie(cookieName);
    document.body.setAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  }, []);

  // Apply env-driven accent override only when sidechain config is valid.
  useEffect(() => {
    const root = document.documentElement;
    const config = getSidechainRewardsConfig();
    const shouldOverrideAccent =
      isSidechainRewardsConfigured(config) && config.textColor.trim().length > 0;

    if (shouldOverrideAccent) {
      const accentHsl = parseColorToHslTriplet(config.textColor.trim());
      if (accentHsl) {
        root.classList.add('he-accent-theme');
        root.style.setProperty('--he-accent-hsl', accentHsl);
      } else {
        root.classList.remove('he-accent-theme');
        root.style.removeProperty('--he-accent-hsl');
      }
    } else {
      root.classList.remove('he-accent-theme');
      root.style.removeProperty('--he-accent-hsl');
    }
  }, []);

  // Handle browser back/forward navigation in subdirectory deployments
  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    if (basePath) {
      const handlePopState = () => {
        const pathWithoutBase = window.location.pathname.replace(basePath, '');
        if (pathWithoutBase.startsWith('/@')) {
          setTimeout(() => {
            window.location.replace(window.location.href);
          }, 0);
        }
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, []);

  return null;
}
