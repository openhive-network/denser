import { useMemo, useState } from 'react';
import { TransferFilters } from '@/wallet/components/transfers-history-filter';

const useFilters = (initialFilters: TransferFilters) => {
  const [rawfilter, setFilter] = useState<TransferFilters>(initialFilters);

  const filter: TransferFilters = useMemo(() => {
    const noFilters = !rawfilter.incoming && !rawfilter.outcoming && !rawfilter.others;
    return {
      ...rawfilter,
      incoming: rawfilter.incoming || noFilters,
      outcoming: rawfilter.outcoming || noFilters,
      others: !rawfilter.search && (rawfilter.others || noFilters)
    };
  }, [rawfilter]);

  return [rawfilter, filter, setFilter] as const;
};
export default useFilters;
