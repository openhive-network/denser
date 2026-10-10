import { useMemo, useState } from 'react';
import { TransferFilters } from '@/wallet/components/transfers-history-filter';
import { resolveFilters } from '@/wallet/lib/history-filter';

const useFilters = (initialFilters: TransferFilters) => {
  const [rawfilter, setFilter] = useState<TransferFilters>(initialFilters);

  const filter: TransferFilters = useMemo(() => resolveFilters(rawfilter), [rawfilter]);

  return [rawfilter, filter, setFilter] as const;
};
export default useFilters;
