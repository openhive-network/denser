import { Button } from '@hive/ui/components/button';
import { Icons } from '@hive/ui/components/icons';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@hive/ui/components/sheet';
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
    <li className="cursor-pointer border-b-2 border-white text-foreground hover:border-red-600 hover:bg-slate-100 dark:border-slate-950 dark:hover:border-red-600 dark:hover:bg-slate-900">
      <Link href={href} target={clsx(target ? '_blank' : '')}>
        <SheetClose className="flex h-full w-full items-center gap-1 p-4 text-sm font-semibold">
          {children}
        </SheetClose>
      </Link>
    </li>
  );
};
const Sidebar = () => {
  const { t } = useTranslation('common_wallet');
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="h-10 w-10 px-0" data-testid="nav-sidebar-menu-button">
          <Icons.sidebarOpen className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        position="right"
        size="sm"
        className="w-5/6 overflow-auto px-0 pt-12 md:w-2/6"
        data-testid="nav-sidebar-menu-content"
      >
        <div className="flex flex-col">
          <ul className="flex flex-col">
            <Item href="/welcome">{t('navigation.sidebar.welcome')}</Item>
            <Item href="/faq.html">{t('navigation.sidebar.faq')}</Item>
            <Item href="/market">{t('navigation.sidebar.currency_market')}</Item>
            <Separator className="my-2" />
            <Item href="/~witnesses">{t('navigation.sidebar.vote_for_witnesses')}</Item>
            <Item href="/proposals">{t('navigation.sidebar.hive_proposals')}</Item>
            <Separator className="my-2" />

            <li className="p-4 text-sm text-slate-500">{t('navigation.sidebar.third_party_exchanges')}</li>
            <Item href="https://blocktrades.us" target>
              {t('navigation.sidebar.blocktrades')}
              <Icons.forward className="w-4" />
            </Item>
            <Item href="https://ionomy.com" target>
              {t('navigation.sidebar.ionomy')}
              <Icons.forward className="w-4" />
            </Item>
            <Separator className="my-2" />
            <Item href="https://openhive.chat" target>
              {t('navigation.sidebar.openhive_chat')} <Icons.forward className="w-4" />
            </Item>
            <Item href="https://hiveprojects.io/" target>
              {t('navigation.sidebar.apps_built_on_hive')} <Icons.forward className="w-4" />
            </Item>
            <Separator className="my-2" />
            <Item href="https://developers.hive.io" target>
              {t('navigation.sidebar.developer_portal')}
              <Icons.forward className="w-4" />
            </Item>
            <Item href="https://hive.io/whitepaper.pdf" target>
              {t('navigation.sidebar.hive_whitepaper')} <Icons.forward className="w-4" />
            </Item>
            <Separator className="my-2" />
            <Item href="/privacy.html">{t('navigation.sidebar.privacy_policy')}</Item>
            <Item href="/tos.html">{t('navigation.sidebar.terms_of_service')}</Item>
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default Sidebar;
