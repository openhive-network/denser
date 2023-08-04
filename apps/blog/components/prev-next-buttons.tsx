import { Button } from '@hive/ui/components/button';

export default function PrevNextButtons({
  onNextPage,
  onPrevPage,
  hasNextPage,
  hasPrevPage,
  isLoading
}: {
  onNextPage: () => void;
  onPrevPage: () => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  isLoading: boolean;
}) {
  return (
    <div className="flex justify-between">
      <Button variant="outlineRed" disabled={!hasPrevPage} onClick={onPrevPage}>
        Previous
      </Button>
      <Button variant="outlineRed" disabled={!hasNextPage || isLoading} onClick={onNextPage}>
        Next
      </Button>{' '}
    </div>
  );
}
