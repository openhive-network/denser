import { Button } from '@hive/ui/components/button';
import { Icons } from '@hive/ui/components/icons';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose
} from '@hive/ui/components/sheet';
import Link from 'next/link';
import { Separator } from '@hive/ui/components/separator';
import clsx from 'clsx';
import { ReactNode } from 'react';
import { useTranslation } from 'next-i18next';

const Item = ({
                href,
                children,
                target = false
              }: {
  href: string;
  children: ReactNode;
  target?: boolean;
}) => {
  return (
    <li
      className='text-foreground border-b-2 border-white dark:hover:border-red-600 hover:border-red-600 dark:border-slate-950 dark:hover:bg-slate-900 hover:bg-slate-100 cursor-pointer'>
      <Link href={href} target={clsx(target ? '_blank' : '')}>
        <SheetClose className='w-full h-full flex items-center p-4 gap-1 text-sm font-semibold'>
          {children}
        </SheetClose>
      </Link>
    </li>
  );
};
const Sidebar = () => {
  const { t } = useTranslation('common_blog');
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant='ghost'
          size='sm'
          className='h-10 w-10 px-0'
          data-testid='nav-sidebar-menu-button'
        >
          <Icons.sidebarOpen className='h-5 w-5' />
        </Button>
      </SheetTrigger>
      <SheetContent
        position='right'
        size='sm'
        className='w-5/6 md:w-2/6 pt-12 px-0 overflow-auto'
        data-testid='nav-sidebar-menu-content'
      >
        <div className='flex flex-col'>
          <ul className='flex flex-col'>
            <Item href='/welcome'>{t('navigation.sidebar.welcome')}</Item>
            <Item href='/faq.html'>{t('navigation.sidebar.faq')}</Item>
            <Item href='https://hiveblocks.com' target>
              Block Explorer
              <Icons.forward className='w-4' />
            </Item>
            <Separator className='my-2' />
            <Item href='http://localhost:4000/recover_account_step_1' target>
              {t('navigation.sidebar.stolen_account_recovery')}
              <Icons.forward className='w-4' />
            </Item>
            <Item href='http://localhost:4000/change_password' target>
              {t('navigation.sidebar.change_account_password')}
              <Icons.forward className='w-4' />
            </Item>
            <Item href='http://localhost:4000/~witnesses' target>
              {t('navigation.sidebar.vote_for_witnesses')}
              <Icons.forward className='w-4' />
            </Item>
            <Item href='http://localhost:4000/proposals' target>
              {t('navigation.sidebar.hive_proposals')}
              <Icons.forward className='w-4' />
            </Item>
            <Separator className='my-2' />
            <Item href='https://openhive.chat' target>
              {t('navigation.sidebar.openhive_chat')} <Icons.forward className='w-4' />
            </Item>
            <Separator className='my-2' />
            <Item href='https://developers.hive.io' target>
              {t('navigation.sidebar.developer_portal')} <Icons.forward className='w-4' />
            </Item>
            <Item href='https://hive.io/whitepaper.pdf' target>
              {t('navigation.sidebar.hive_whitepaper')} <Icons.forward className='w-4' />
            </Item>
            <Separator className='my-2' />
            <Item href='/privacy.html'>{t('navigation.sidebar.privacy_policy')}</Item>
            <Item href='/tos.html'>{t('navigation.sidebar.terms_of_service')}</Item>
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default Sidebar;
