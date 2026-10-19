import type { ReactNode } from 'react';
import { Link } from '@hive/ui';
import { isLiteDid } from './lite-did';

interface Props {
  author: string;
  className?: string;
  children: ReactNode;
  'data-testid'?: string;
}

/** A link to the author's profile; plain text for a lite account, which has no profile page. */
export default function AuthorProfileLink({ author, className, children, 'data-testid': testId }: Props) {
  if (isLiteDid(author)) {
    return (
      <span className={className} data-testid={testId}>
        {children}
      </span>
    );
  }
  return (
    <Link href={`/@${author}`} className={className} data-testid={testId}>
      {children}
    </Link>
  );
}
