import { GetServerSideProps, GetServerSidePropsResult, Redirect } from 'next';
import { consentPageController } from '@smart-signer/lib/consent-page-controller';
import { getTranslations } from '../../../lib/get-translations';

export default function ConsentPage() {
  return (
    <div
      className="mx-2 flex flex-col gap-24 pt-16 sm:flex-row
        sm:justify-around sm:gap-0"
    >
      <div className="flex flex-col gap-3 sm:mr-4 sm:gap-8">
        <div className="text-lg font-bold sm:text-3xl">Consent</div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const result: GetServerSidePropsResult<{ [key: string]: any }> & { redirect?: Redirect, props?: { [key: string]: any } }
      = await consentPageController(ctx);
  if (Object.hasOwnProperty.call(result, 'props')) {
    const output: GetServerSidePropsResult<{ [key: string]: any }> = {
      props: {
        ...result.props,
        ...(await getTranslations(ctx)),
      },
    };
    return output;
  }
  return result;
};
