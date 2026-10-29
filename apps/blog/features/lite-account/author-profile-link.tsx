import type { ReactNode } from 'react';
import { Link } from '@hive/ui';

interface Props {
  author: string;
  className?: string;
  children: ReactNode;
  'data-testid'?: string;
}

/** A link to the author's profile: `/@<account>`, or `/@did:lite:<name>` for a lite account. */
export default function AuthorProfileLink({ author, className, children, 'data-testid': testId }: Props) {
  return (
    <Link href={`/@${author}`} className={className} data-testid={testId}>
      {children}
    </Link>
  );
}
