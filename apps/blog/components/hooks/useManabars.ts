import { useQuery } from '@tanstack/react-query';
import { getManabar, Manabar } from '@transaction/lib/hive';

function getManabarStats(data: Manabar | undefined | null) {
  if (!data) return undefined;
  const angle = {
    rc: (360 * data.rc.percentageValue) / 100,
    upvote: (360 * data.upvote.percentageValue) / 100,
    downvote: (360 * data.downvote.percentageValue) / 100
  };
  const percent = {
    rc: data.rc.percentageValue,
    upvote: data.upvote.percentageValue,
    downvote: data.downvote.percentageValue
  };
  const cooldown = {
    rc: data.rc.cooldown,
    upvote: data.upvote.cooldown,
    downvote: data.downvote.cooldown
  };
  return { angle, cooldown, percent };
}

const useManabars = (accountName: string) => {
  const {
    data: manabarsData,
    isLoading: manabarsDataLoading,
    isError: manabarsDataError
  } = useQuery(['manabars', accountName], () => getManabar(accountName), {
    enabled: !!accountName
  });
  const manabarStats = getManabarStats(manabarsData);
  return { manabarStats, manabarsData, manabarsDataLoading, manabarsDataError };
};

export default useManabars;
