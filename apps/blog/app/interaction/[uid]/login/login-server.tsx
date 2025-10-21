import { loginPageController } from '@smart-signer/lib/login-page-controller';
import { notFound, redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { getLogger } from '@ui/lib/logging';
import LoginClient from './login-client';

const logger = getLogger('app');

interface LoginServerProps {
  uid: string;
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function LoginServer({ uid, searchParams }: LoginServerProps) {
  try {
    // Get cookies and headers from App Router
    const cookieStore = cookies();
    const headersList = headers();

    // Create a mock context object similar to what getServerSideProps expects
    const mockCtx = {
      query: { uid, ...searchParams },
      req: {
        cookies: Object.fromEntries(cookieStore.getAll().map((c) => [c.name, c.value])),
        headers: Object.fromEntries(headersList.entries())
      } as any,
      res: {} as any
    };

    logger.info('LoginServer: Processing login for uid:', uid);
    const result = await loginPageController(mockCtx as any);

    // Handle different result types
    if ('notFound' in result && result.notFound) {
      logger.info('LoginServer: Not found response from controller');
      notFound();
    }

    if ('redirect' in result && result.redirect) {
      logger.info('LoginServer: Redirecting to:', result.redirect.destination);
      redirect(result.redirect.destination);
    }

    if ('props' in result && result.props) {
      // Extract the props we need from the result
      const { redirectTo } = result.props as any;

      logger.info('LoginServer: Rendering login page with redirectTo:', redirectTo);
      return <LoginClient redirectTo={redirectTo} />;
    }

    // Fallback - no props case (loginPageController returns { props: {} } when not in OAuth flow)
    logger.info('LoginServer: No redirectTo prop, rendering basic login page');
    return <LoginClient />;
  } catch (error) {
    logger.error('LoginServer: Error processing login:', error);
    notFound();
  }
}
