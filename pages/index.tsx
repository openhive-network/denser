import { Inter } from 'next/font/google';
import { FC } from 'react';
import { siteConfig } from '@/config/site';

const inter = Inter({ subsets: ['latin'] });

const Home: FC = (props) => {
  // @ts-ignore
  siteConfig.endpoint = props.endpoint


  return (
    <main
      className={`${inter.className} flex min-h-screen flex-col items-center justify-between p-24`}
    ></main>
  );
};

export default Home;

async function getServerSideProps() {
  return {
    props: { endpoint: global.process.env.API_NODE_ENDPOINT }
  }
}
