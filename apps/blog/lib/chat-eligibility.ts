export interface ChatEligibilityRules {
  allowNonStrictLogin: boolean;
  /** Usernames that may chat; empty lets everyone */
  allowedUsers: string[];
}

interface ChatCandidate {
  isLoggedIn: boolean;
  strict: boolean;
  username: string;
}

/** Whether the chat widget is offered to `user`, whichever chat server it uses. */
export function isEligibleForChat(user: ChatCandidate, rules: ChatEligibilityRules): boolean {
  return (
    user.isLoggedIn &&
    (user.strict || rules.allowNonStrictLogin) &&
    (rules.allowedUsers.length === 0 || rules.allowedUsers.includes(user.username))
  );
}
