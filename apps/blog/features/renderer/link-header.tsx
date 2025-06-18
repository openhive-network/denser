import Link from 'next/link';
import { ReactNode } from 'react';

const LinkHeader = ({ children, id = '' }: { children: ReactNode; id?: string }) => {
  const headerId = id
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
  return (
    <Link href={`#${headerId}`} id={headerId} className="w-full text-primary hover:underline">
      {children}
    </Link>
  );
};

export default LinkHeader;
