import { Inter } from 'next/font/google';
import { FC } from 'react';

const inter = Inter({ subsets: ['latin'] });

const Home: FC = () => {
  return (
    <main
      className={`${inter.className} flex min-h-screen flex-col items-center justify-between p-24`}
    ></main>
  );
};

export default Home;
