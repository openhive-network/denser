import { Inter } from 'next/font/google';
import Head from 'next/head';
import { FC } from 'react';

const inter = Inter({ subsets: ['latin'] });

const TAB_TITLE = 'Hive Blog';
const Home: FC = () => {
  return (
    <>
      <Head>
        <title>{TAB_TITLE}</title>
      </Head>
      <main
        className={`${inter.className} flex min-h-screen flex-col items-center justify-between p-24`}
      ></main>
    </>
  );
};

export default Home;
