'use client';

import { useQuery } from '@tanstack/react-query';
import { liteGraduationQuery } from './lite-graduation-query';
import { graduationOffer, type GraduationOffer } from './lite-graduation-state';
import type { StoredLiteIdentity } from './lite-identity-record';
import { useLiteGraduationAccess } from './use-lite-graduation';

/** What graduation offers `identity`, read from the gateway while `enabled`; null when unavailable or not read yet. */
export function useLiteGraduationOffer(identity: StoredLiteIdentity | null, enabled: boolean): GraduationOffer | null {
  const { available } = useLiteGraduationAccess(identity);
  const { data } = useQuery({ ...liteGraduationQuery(identity?.name ?? ''), enabled: available && enabled && !!identity });
  return available && data ? graduationOffer(data) : null;
}
