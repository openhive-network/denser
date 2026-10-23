import { notFound } from 'next/navigation';
import { postAuthorFromParam, postAuthorKind } from '@/blog/features/lite-account/lite-did';
import LiteDevices from '@/blog/features/lite-account/lite-devices';

/** The Devices tab of a lite account's profile; it lists keys for the browser holding that account only. */
const DevicesPage = async (props: { params: Promise<{ param: string }> }) => {
  const { param } = await props.params;
  const author = postAuthorFromParam(param);
  if (!author || postAuthorKind(author) !== 'lite') notFound();
  return <LiteDevices did={author} />;
};

export default DevicesPage;
