import HealthCheckersWrapper from "../components/healthcheckers-wrapper";
import { getDefaultProps } from '../lib/get-translations';
import { GetServerSideProps } from 'next';
import Head from 'next/head';

export const getServerSideProps: GetServerSideProps = getDefaultProps;
const Healthchecker = () => {
  const TAB_TITLE = 'Healthcheckers';

  return <>
    <Head><title>{TAB_TITLE}</title></Head>
    <HealthCheckersWrapper />
  </>
}

export default Healthchecker