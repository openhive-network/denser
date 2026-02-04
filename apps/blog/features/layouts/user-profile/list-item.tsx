'use client';

import clsx from 'clsx';
import { Link } from '@hive/ui';

const ListItem = ({ href, currentTab, label }: { href: string; currentTab: boolean; label: string }) => {
  return (
    <li className="flex-shrink-0">
      <Link
        href={href}
        className={clsx(
          'relative flex h-12 items-center whitespace-nowrap px-3 text-sm font-medium transition-colors',
          'hover:text-white/90',
          currentTab
            ? 'text-white after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-red-500'
            : 'text-white/70'
        )}
      >
        {label}
      </Link>
    </li>
  );
};

export default ListItem;
