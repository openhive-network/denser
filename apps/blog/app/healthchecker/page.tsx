'use client';
import HealthCheckersWrapper from '@/blog/components/healthcheckers-wrapper';
import Head from 'next/head';

const Healthchecker = () => {
  const TAB_TITLE = 'Healthcheckers';

  return <>
    <Head><title>{TAB_TITLE}</title></Head>
    <HealthCheckersWrapper />
  </>
}

export default Healthchecker
