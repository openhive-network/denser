'use client';

import clsx from 'clsx';
import { Link } from '@hive/ui';

const ListItem = ({ href, currentTab, label }: { href: string; currentTab: boolean; label: string }) => {
  return (
    <li>
      <Link
        href={href}
        className={clsx('flex h-12 items-center px-2 hover:bg-background hover:text-primary', {
          'bg-background text-primary dark:hover:text-foreground': currentTab
        })}
      >
        {label}
      </Link>
    </li>
  );
};

export default ListItem;
