import * as Sentry from "@sentry/nextjs";
import Error from "next/error";
import type { NextPageContext } from "next/types";
import env from "@beam-australia/react-env";

const CustomErrorComponent = (props: { statusCode: number; title?: string; withDarkMode?: boolean; }) => {
  return <Error statusCode={props.statusCode} />;
};

CustomErrorComponent.getInitialProps = async (contextData: NextPageContext) => {
  // In case this is running in a serverless function, await this in order to give Sentry
  // time to send the error before the lambda exits

  if (!!env('SENTRY_DSN')) {
    await Sentry.captureUnderscoreErrorException(contextData);
  }

  // This will contain the status code of the response
  return Error.getInitialProps(contextData);
};

export default CustomErrorComponent;
