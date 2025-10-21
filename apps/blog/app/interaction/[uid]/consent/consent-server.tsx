import { consentPageController } from '@smart-signer/lib/consent-page-controller';
import { notFound, redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { getLogger } from '@ui/lib/logging';
import ConsentClient from './consent-client';

const logger = getLogger('app');

interface ConsentServerProps {
  uid: string;
}

export default async function ConsentServer({ uid }: ConsentServerProps) {
  try {
    // Get cookies and headers from App Router
    const cookieStore = cookies();
    const headersList = headers();

    // Create a mock context object similar to what getServerSideProps expects
    const mockCtx = {
      query: { uid },
      req: {
        cookies: Object.fromEntries(cookieStore.getAll().map((c) => [c.name, c.value])),
        headers: Object.fromEntries(headersList.entries())
      } as any,
      res: {} as any
    };

    logger.info('ConsentServer: Processing consent for uid:', uid);
    const result = await consentPageController(mockCtx as any);

    // Handle different result types
    if ('notFound' in result && result.notFound) {
      logger.info('ConsentServer: Not found response from controller');
      notFound();
    }

    if ('redirect' in result && result.redirect) {
      logger.info('ConsentServer: Redirecting to:', result.redirect.destination);
      redirect(result.redirect.destination);
    }

    if ('props' in result && result.props) {
      // Extract the props we need from the result
      const { oidcClientDetails, redirectTo } = result.props as any;

      if (!oidcClientDetails) {
        logger.error('ConsentServer: Missing oidcClientDetails in props');
        notFound();
      }

      logger.info('ConsentServer: Rendering consent page for client:', oidcClientDetails.clientId);
      return <ConsentClient oidcClientDetails={oidcClientDetails} redirectTo={redirectTo} />;
    }

    // Fallback - no props case
    logger.error('ConsentServer: No props in result, returning not found');
    notFound();
  } catch (error) {
    logger.error('ConsentServer: Error processing consent:', error);
    notFound();
  }
}
