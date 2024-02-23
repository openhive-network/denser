import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { useRouter } from 'next/router';
import createHttpError from 'http-errors';
import { getTranslations } from '@/auth/lib/get-translations';
import { oidc } from '@smart-signer/lib/oidc';
import { redirect } from 'next/navigation';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

export default function InteractionPage({
  redirectTo
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();
  const uid = router.query.slug;

  // if (redirectTo) {
  //   router.push(redirectTo);
  // }

  return (
    <div
      className="mx-2 flex flex-col gap-24 pt-16 sm:flex-row
        sm:justify-around sm:gap-0"
    >
      <div className="flex flex-col gap-3 sm:mr-4 sm:gap-8">
        <div className="text-lg font-bold sm:text-3xl">Interaction</div>
      </div>
    </div>
  );
}

// export async function getServerSideProps<GetServerSideProps>({ req, res }) {
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  let redirectTo = '';
  try {
    // const {
    //   uid, prompt, params, session,
    // } = await oidc.interactionDetails(req, res);
    // logger.info({
    //   uid, prompt, params, session,
    // });
    //   if (prompt.name === 'login') {
    //     // return ctx.render('login', {
    //     //   uid,
    //     //   details: prompt.details,
    //     //   params,
    //     //   session: session ? debug(session) : undefined,
    //     //   title: 'Sign-In',
    //     //   dbg: {
    //     //     params: debug(params),
    //     //     prompt: debug(prompt),
    //     //   },
    //     // })
    //     redirectTo = '/login';
    //     // redirect('/login');
    //     return {
    //       redirect: {
    //         destination: '/login',
    //         permanent: false,
    //       },
    //     };
    //   } else if (prompt.name === 'consent') {
    //     // return ctx.render('consent', {
    //     //   uid,
    //     //   title: 'Authorize',
    //     //   clientId: params.client_id,
    //     //   scope: params.scope.replace(/ /g, ', '),
    //     //   session: session ? debug(session) : undefined,
    //     //   dbg: {
    //     //     params: debug(params),
    //     //     prompt: debug(prompt),
    //     //   },
    //     // })
    //     throw new createHttpError.NotImplemented();
    //   } else {
    //     throw new createHttpError.NotImplemented();
    //   }
  } catch (err) {
    throw err;
  }

  return {
    props: {
      redirectTo,
      ...(await getTranslations(ctx))
    }
  };
};
