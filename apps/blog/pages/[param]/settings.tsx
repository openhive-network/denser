import Router from 'next/router';
import { Icons } from '@hive/ui/components/icons';
import ProfileLayout from '@/blog/components/common/profile-layout';
import { Button } from '@hive/ui/components/button';
import { Input } from '@hive/ui/components/input';
import { Label } from '@hive/ui/components/label';
import { RadioGroup, RadioGroupItem } from '@hive/ui/components/radio-group';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@hive/ui/components/select';
import { siteConfig } from '@hive/ui/config/site';
import { useLocalStorage } from '@/blog/components/hooks/use-local-storage';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { i18n } from '@/blog/next-i18next.config';
import { useState, useEffect } from 'react';
import useUser from '@/blog/components/hooks/use-user';
import { useParams } from 'next/navigation';

export default function UserSettings() {
  const [endpoint, setEndpoint] = useLocalStorage('hive-blog-endpoint', siteConfig.endpoint);
  const [isClient, setIsClient] = useState(false);
  const params = useParams();
  const { user } = useUser();

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <ProfileLayout>
      <div className="flex flex-col" data-testid="public-profile-settings">
        {isClient && user?.isLoggedIn && user?.username === params.param.slice(1) ? (
          <>
            <div className="py-8">
              <h2 className="py-4 text-lg font-semibold leading-5 text-slate-900 dark:text-white">
                Public Profile Settings
              </h2>
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div>
                  <Label htmlFor="profileImage">Profile picture url</Label>
                  <Input type="text" id="profileImage" name="profileImage" />
                  <span className="text-sm font-normal text-red-600 hover:cursor-pointer">
                    Upload an image
                  </span>
                </div>

                <div>
                  <Label htmlFor="coverImage">Cover image url (Optimal: 2048 x 512 px)</Label>
                  <Input type="text" id="coverImage" name="coverImage" />
                  <span className="text-md font-normal text-red-600 hover:cursor-pointer">
                    Upload an image
                  </span>
                </div>

                <div>
                  <Label htmlFor="name">Display Name</Label>
                  <Input type="text" id="name" name="name" />
                </div>

                <div>
                  <Label htmlFor="about">About</Label>
                  <Input type="email" id="about" name="about" />
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input type="text" id="location" name="location" />
                </div>

                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input type="text" id="website" name="website" />
                </div>

                <div>
                  <Label htmlFor="blacklistDescription">Blacklist Description</Label>
                  <Input type="text" id="blacklistDescription" name="blacklistDescription" />
                </div>

                <div>
                  <Label htmlFor="mutedListDescription">Mute List Description</Label>
                  <Input type="text" id="mutedListDescription" name="mutedListDescription" />
                </div>
              </div>
              <Button className="my-4 w-44" data-testid="pps-update-button">
                Update
              </Button>
            </div>
            <div className="py-8" data-testid="settings-preferences">
              <h2 className="py-4 text-lg font-semibold leading-5 text-slate-900 dark:text-white">
                Preferences
              </h2>

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div data-testid="choose-language">
                  <Select defaultValue="en">
                    <SelectTrigger>
                      <SelectValue placeholder="Choose Language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Choose Language</SelectLabel>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish Español</SelectItem>
                        <SelectItem value="ru">Russian русский</SelectItem>
                        <SelectItem value="fr">French français</SelectItem>
                        <SelectItem value="it">Italian italiano</SelectItem>
                        <SelectItem value="ko">Korean 한국어</SelectItem>
                        <SelectItem value="ja">Japanese 日本語</SelectItem>
                        <SelectItem value="pl">Polish Polski</SelectItem>
                        <SelectItem value="zh">Chinese 简体中文</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div data-testid="not-safe-for-work-content">
                  <Select defaultValue="hide">
                    <SelectTrigger>
                      <SelectValue placeholder="Not safe for work (NSFW) content" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Not safe for work (NSFW) content</SelectLabel>
                        <SelectItem value="hide">Always hide</SelectItem>
                        <SelectItem value="warn">Always warn</SelectItem>
                        <SelectItem value="show">Always show</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div data-testid="blog-post-rewards">
                  <Select defaultValue="50%">
                    <SelectTrigger>
                      <SelectValue placeholder="Blog post rewards" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Blog post rewards</SelectLabel>
                        <SelectItem value="0%">Decline Payout</SelectItem>
                        <SelectItem value="50%">50% HBD / 50% HP</SelectItem>
                        <SelectItem value="100%">Power Up 100%</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div data-testid="comment-post-rewards">
                  <Select defaultValue="50%">
                    <SelectTrigger>
                      <SelectValue placeholder="Comment post rewards" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Comment post rewards</SelectLabel>
                        <SelectItem value="0%">Decline Payout</SelectItem>
                        <SelectItem value="50%">50% HBD / 50% HP</SelectItem>
                        <SelectItem value="100%">Power Up 100%</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div data-testid="referral-system">
                  <Select defaultValue="enabled">
                    <SelectTrigger>
                      <SelectValue placeholder="Referral System" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Referral System</SelectLabel>
                        <SelectItem value="enabled">Use Default Beneficiaries</SelectItem>
                        <SelectItem value="disabled">Opt-Out Referral System</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </>
        ) : null}

        <div className="py-8">
          <h2 className="py-4 text-lg font-semibold leading-5 text-slate-900 dark:text-white">Advanced</h2>
          <h4 className="text-md py-2 font-semibold leading-5 text-slate-900 dark:text-white">
            API Endpoint Options
          </h4>

          <RadioGroup
            defaultValue="https://api.hive.blog"
            className="w-full gap-0 md:w-8/12"
            data-testid="api-endpoint-radiogroup"
            onValueChange={(e) => {
              setEndpoint(e);
              Router.reload();
            }}
            value={endpoint}
          >
            <div className="grid grid-cols-3">
              <span> Endpoint</span>
              <span>Preferred?</span>
              <span>Remove</span>
            </div>
            <div className="grid grid-cols-3 items-center bg-slate-100 p-2 dark:bg-slate-500">
              <Label htmlFor="e1">https://api.hive.blog</Label>
              <RadioGroupItem value="https://api.hive.blog" id="e1" className="border-red-600" />
              <Icons.trash />
            </div>
            <div className="grid grid-cols-3 items-center bg-slate-200 p-2 dark:bg-slate-600">
              <Label htmlFor="e2">https://rpc.ausbit.dev</Label>
              <RadioGroupItem value="https://rpc.ausbit.dev" id="e2" className="border-red-600" disabled />
              <Icons.trash />
            </div>
            <div className="grid grid-cols-3 items-center bg-slate-100 p-2 dark:bg-slate-500">
              <Label htmlFor="e3">https://anyx.io</Label>
              <RadioGroupItem value="https://anyx.io" id="e3" className="border-red-600" />
              <Icons.trash />
            </div>
            <div className="grid grid-cols-3 items-center bg-slate-200 p-2 dark:bg-slate-600">
              <Label htmlFor="e4">https://api.deathwing.me</Label>
              <RadioGroupItem value="https://api.deathwing.me" id="e4" className="border-red-600" />
              <Icons.trash />
            </div>
          </RadioGroup>

          <div className="my-4 flex w-full max-w-sm items-center space-x-2" data-testid="add-api-endpoint">
            <Input type="text" placeholder="Add API Endpoint" />
            <Button type="submit">Add</Button>
          </div>

          <Button className="my-4 w-44">Reset Endpoints</Button>
        </div>
      </div>
    </ProfileLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  return {
    props: {
      ...(await serverSideTranslations(req.cookies.NEXT_LOCALE! || i18n.defaultLocale, ['common_blog']))
    }
  };
};
