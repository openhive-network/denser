import { useLoggedUserNetVests } from './logged-user-contexts';

const VOTE_WEIGHT_DROPDOWN_THRESHOLD = 1.0 * 1000.0 * 1000.0;

/**
 * Whether the signed-in voter has the vests to pick a vote's weight on a slider instead of
 * voting at full weight. False until their account loads. A page has a vote button per post and
 * comment: read this in the smallest component that depends on it, as the account's loading
 * re-renders every reader.
 */
export const useVoteSliderEnabled = (): boolean => useLoggedUserNetVests() > VOTE_WEIGHT_DROPDOWN_THRESHOLD;
