import { GetServerSideProps } from 'next';
import { getTranslations } from '@/auth/lib/get-translations';
import config from "config";

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

export default function HomePage() {
  logger.info(
    'config.get("Customer.credit.initialLimit")',
    config.get("Customer.credit.initialLimit"),
  );
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

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  console.log('Customer.credit.initialLimit: %s', config.get("Customer.credit.initialLimit"));
  return {
    props: {
      ...(await getTranslations(ctx)),
    }
  };
};
