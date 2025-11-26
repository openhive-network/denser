import { getAccountFull } from '@transaction/lib/hive-api';
import { useQuery } from '@tanstack/react-query';

const useAccountData = (username: string) => {
  const { data } = useQuery(['accountData', username], () => getAccountFull(username), {
    enabled: Boolean(username)
  });

  return (
    data &&
    data.profile && {
      avatar: data.profile.profile_image,
      memo_key: data.memo_key,
      owner: {
        weight_threshold: data.owner.weight_threshold,
        account_auths: data.owner.account_auths,
        key_auths: data.owner.key_auths
      },
      active: {
        weight_threshold: data.active.weight_threshold,
        account_auths: data.active.account_auths,
        key_auths: data.active.key_auths
      },
      posting: {
        weight_threshold: data.posting.weight_threshold,
        account_auths: data.posting?.account_auths,
        key_auths: data.posting?.key_auths
      }
    }
  );
};
export default useAccountData;
