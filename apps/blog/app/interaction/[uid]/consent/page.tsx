import ConsentServer from './consent-server';
import { Metadata } from 'next';

interface ConsentPageProps {
  params: {
    uid: string;
  };
}

export const metadata: Metadata = {
  title: 'OAuth Consent - Hive',
  description: 'OAuth consent page for Hive applications',
  robots: 'noindex'
};

export default function ConsentPage({ params }: ConsentPageProps) {
  return <ConsentServer uid={params.uid} />;
}
