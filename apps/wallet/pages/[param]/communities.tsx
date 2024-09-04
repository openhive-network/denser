import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import ProfileLayout from '@/wallet/components/common/profile-layout';
import { useTranslation } from 'next-i18next';
import WalletMenu from '@/wallet/components/wallet-menu';
import { Button, Checkbox, Input, Label } from '@ui/components';
import { useState } from 'react';
import { getTranslations } from '../../lib/get-translations';
import { createWaxFoundation } from '@hiveio/wax';

function Communities({ username }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { t } = useTranslation('common_wallet');
  const [nextStep, setNextStep] = useState(false);
  const [generatedName, setGeneratedName] = useState<string>();
  const [generatedPassword, setGeneratedPassword] = useState<string>();
  const [publicKeys, setPublicKeys] = useState<{
    active: string;
    owner: string;
    posting: string;
  }>();

  const handleNext = async () => {
    setGeneratedName(`hive-${Math.floor(Math.random() * 100000) + 100000}`);

    const wax = await createWaxFoundation();
    // generate password
    const brainKeyData = wax.suggestBrainKey();
    const passwordToBeSavedByUser = brainKeyData.wifPrivateKey;
    setGeneratedPassword(passwordToBeSavedByUser);

    // private keys for account authorities
    const owner = wax.getPrivateKeyFromPassword(username, 'owner', passwordToBeSavedByUser);
    const active = wax.getPrivateKeyFromPassword(username, 'active', passwordToBeSavedByUser);
    const posting = wax.getPrivateKeyFromPassword(username, 'posting', passwordToBeSavedByUser);

    setPublicKeys({
      active: active.associatedPublicKey,
      owner: owner.associatedPublicKey,
      posting: posting.associatedPublicKey
    });

    setNextStep(true);
  };

  return (
    <ProfileLayout>
      <div className="flex flex-col gap-8 ">
        <div className="flex gap-6">
          <WalletMenu username={username} />
        </div>
        <div className="flex flex-col gap-4 p-4">
          <h4>Create a community</h4>
          <div>
            Title
            <Input />
          </div>
          <div>
            About
            <Input />
          </div>
          {!nextStep ? (
            <Button onClick={() => handleNext()} className="w-fit">
              Next
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col border-2 bg-white p-2 text-red-700">
                <span>{generatedName}</span> <span>{generatedPassword}</span>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="terms" />
                  <Label htmlFor="terms">I have securely saved my owner name and password.</Label>
                </div>
              </div>
              <Button className="w-fit">Create community</Button>
            </div>
          )}
        </div>
      </div>
    </ProfileLayout>
  );
}

export default Communities;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const username = ctx.params?.param as string;

  if (username[0] !== '@') {
    return {
      notFound: true
    };
  }

  return {
    props: {
      username: username.replace('@', ''),
      ...(await getTranslations(ctx))
    }
  };
};
