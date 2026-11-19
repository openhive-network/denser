import type { AuthorityProblem } from '@/wallet/lib/authority-checks';
import { useTranslation } from '@/wallet/i18n/client';

/** Why the edited authorities cannot be submitted, one line per role that fails. */
const AuthorityProblems = ({ problems }: { problems: readonly AuthorityProblem[] }) => {
  const { t } = useTranslation('common_wallet');
  if (!problems.length) return null;
  return (
    <ul role="alert" className="flex flex-col gap-1 text-sm text-destructive" data-testid="authority-problems">
      {problems.map((problem) => (
        <li key={`${problem.kind}-${problem.level}`}>
          {problem.kind === 'owner_empty'
            ? t('authorities_page.problems.owner_empty')
            : t('authorities_page.problems.unreachable_threshold', {
                authority: t(`authorities_page.${problem.level}_authority`),
                threshold: problem.threshold,
                total: problem.total
              })}
        </li>
      ))}
    </ul>
  );
};

export default AuthorityProblems;
