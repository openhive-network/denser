import { GetServerSideProps } from 'next';
import { getServerSidePropsDefault } from '../lib/get-translations';

export const getServerSideProps: GetServerSideProps = getServerSidePropsDefault;

export default function HomePage() {
  return (
    <div className="pt-16 flex flex-col sm:flex-row gap-24 mx-2
        sm:gap-0 sm:justify-around">
      <div className="flex flex-col gap-3 sm:gap-8 sm:mr-4">
        <div
          className="font-bold text-lg sm:text-3xl"
          data-testid="home-inscription"
          >
          Hive Auth
        </div>
      </div>
    </div>
  );
}
