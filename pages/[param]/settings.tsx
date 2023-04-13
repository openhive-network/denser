import { Icons } from "@/components/icons"
import { Layout } from "@/components/layout"
import LayoutProfile from "@/components/layout-profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLocalStorage } from "@/hooks/use-local-storage";

export default function UserSettings() {
  const [ endpoint, setEndpoint] = useLocalStorage('hive-blog-endpoint', "api.hive.blog")
  return (
    <div className="flex flex-col" data-testid="public-profile-settings">
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
            <Label htmlFor="coverImage">
              Cover image url (Optimal: 2048 x 512 px)
            </Label>
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
            <Input
              type="text"
              id="blacklistDescription"
              name="blacklistDescription"
            />
          </div>

          <div>
            <Label htmlFor="mutedListDescription">Mute List Description</Label>
            <Input
              type="text"
              id="mutedListDescription"
              name="mutedListDescription"
            />
          </div>
        </div>
        <Button className="my-4 w-44">Update</Button>
      </div>

      <div className="py-8">
        <h2 className="py-4 text-lg font-semibold leading-5 text-slate-900 dark:text-white">
          Preferences
        </h2>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div>
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

          <div>
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

          <div>
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

          <div>
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

          <div>
            <Select defaultValue="enabled">
              <SelectTrigger>
                <SelectValue placeholder="Referral System" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Referral System</SelectLabel>
                  <SelectItem value="enabled">
                    Use Default Beneficiaries
                  </SelectItem>
                  <SelectItem value="disabled">
                    Opt-Out Referral System
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="py-8">
        <h2 className="py-4 text-lg font-semibold leading-5 text-slate-900 dark:text-white">
          Advanced
        </h2>
        <h4 className="text-md py-2 font-semibold leading-5 text-slate-900 dark:text-white">
          API Endpoint Options
        </h4>

        <RadioGroup
          defaultValue="https://api.hive.blog"
          className="w-8/12 gap-0"
          onValueChange={e => {console.log('e', e); return setEndpoint(e)}}
          value={endpoint}
        >
          <div className="grid grid-cols-3">
            <span> Endpoint</span>
            <span>Preferred?</span>
            <span>Remove</span>
          </div>
          <div className="grid grid-cols-3 items-center bg-slate-100 p-2 dark:bg-slate-500">
            <Label htmlFor="e1">https://api.hive.blog</Label>
            <RadioGroupItem value="api.hive.blog" id="e1" />
            <Icons.trash />
          </div>
          <div className="grid grid-cols-3 items-center bg-slate-200 p-2 dark:bg-slate-600">
            <Label htmlFor="e2">https://rpc.ausbit.dev</Label>
            <RadioGroupItem value="rpc.ausbit.dev" id="e2" />
            <Icons.trash />
          </div>
          <div className="grid grid-cols-3 items-center bg-slate-100 p-2 dark:bg-slate-500">
            <Label htmlFor="e3">https://anyx.io</Label>
            <RadioGroupItem value="anyx.io" id="e3" />
            <Icons.trash />
          </div>
          <div className="grid grid-cols-3 items-center bg-slate-200 p-2 dark:bg-slate-600">
            <Label htmlFor="e4">https://api.deathwing.me</Label>
            <RadioGroupItem value="api.deathwing.me" id="e4" />
            <Icons.trash />
          </div>
        </RadioGroup>

        <div className="my-4 flex w-full max-w-sm items-center space-x-2">
          <Input type="text" placeholder="Add API Endpoint" />
          <Button type="submit">Add</Button>
        </div>

        <Button className="my-4 w-44">Reset Endpoints</Button>
      </div>
    </div>
  )
}

UserSettings.getLayout = function getLayout(page) {
  return (
    <Layout>
      <LayoutProfile>{page}</LayoutProfile>
    </Layout>
  )
}
