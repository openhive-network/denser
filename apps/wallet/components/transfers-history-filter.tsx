import { Checkbox } from "@hive/ui/components/checkbox";
import { Input } from "@hive/ui/components/input";

export type TransferFilters = {
  search: string;
  others: boolean;
  incoming: boolean;
  outcoming: boolean;
  exlude: boolean;
};
interface TransfersHistoryFilterProps {
  onFiltersChange: (value: Partial<TransferFilters>) => void;
  value: TransferFilters;
}
function TransfersHistoryFilter({
  onFiltersChange,
  value,
}: TransfersHistoryFilterProps) {
  return (
    <div className="flex flex-col  gap-2 border-b-2 border-zinc-500 p-2 sm:p-4 text-xs">
      <h1 className="font-bold">FILTERS</h1>

      <div className="flex gap-1 sm:gap-4">
        <div className="flex flex-col gap-2">
          <label className="flex gap-1 sm:gap-2">
            <Checkbox
              className="border-zinc-700"
              checked={value.others}
              onClick={() => onFiltersChange({ others: !value.others })}
            />
            <span>OTHERS</span>
          </label>
          <label className="flex gap-1 sm:gap-2">
            <Checkbox
              className="border-zinc-700"
              checked={value.incoming}
              onClick={() => onFiltersChange({ incoming: !value.incoming })}
            />
            <span>INCOMING</span>
          </label>
          <label className="flex gap-1 sm:gap-2">
            <Checkbox
              className="border-zinc-700"
              checked={value.outcoming}
              onClick={() => onFiltersChange({ outcoming: !value.outcoming })}
            />
            <span>OUTCOMING</span>
          </label>
          <label className="flex gap-1 sm:gap-2">
            <Checkbox
              className="border-zinc-700"
              checked={value.exlude}
              onClick={() => onFiltersChange({ exlude: !value.exlude })}
            />
            <span>EXCLUDE LESS THAN 1 HBD/HIVE</span>
          </label>
        </div>
        <div className="flex flex-col gap-1 sm:gap-2">
          <div className="flex flex-col gap-1">
            <span>SEARCH BY USER</span>
            <Input
              className="border-zinc-500"
              placeholder="username"
              value={value.search}
              onChange={(e) =>
                onFiltersChange({
                  search: e.target.value,
                })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
export default TransfersHistoryFilter;
