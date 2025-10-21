import LoginServer from './login-server';
import { Metadata } from 'next';

interface LoginPageProps {
  params: {
    uid: string;
  };
  searchParams: { [key: string]: string | string[] | undefined };
}

export const metadata: Metadata = {
  title: 'OAuth Login - Hive',
  description: 'OAuth login page for Hive applications',
  robots: 'noindex'
};

export default function LoginPage({ params, searchParams }: LoginPageProps) {
  return <LoginServer uid={params.uid} searchParams={searchParams} />;
}
