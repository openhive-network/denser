/* Component that represents other (secondary) auth options */
import { FC } from "react";
import { useTranslation } from 'next-i18next';
import { Button, TooltipProvider, Tooltip, TooltipTrigger, TooltipContent, Separator } from "@hive/ui";
import { Icons } from "@hive/ui/components/icons";
import { Steps } from "../form";
import Step from "../step";

export interface MethodsProps {
    onSetStep: (step: Steps) => void;
    i18nNamespace: string;
}

const Methods: FC<MethodsProps> = ({ onSetStep, i18nNamespace = 'smart-signer' }) => {
    const { t } = useTranslation(i18nNamespace);

    return (
        <Step title={t("login_form.other_signin_options")}>
            <div className='flex flex-col items-start'>
                <Button className='py-6 w-full flex' type='button' variant="ghost">
                    {/* Add logo for that */}
                    < div className='flex flex-1 items-center' > <Icons.keyRound className='w-8 h-8 mr-4' /> Sign in with WIF (Legacy)</div >
                </Button >

                <Separator className='w-full my-1' />
                <Button className='py-6 w-full flex' type='button' variant="ghost">
                    {/* Add logo for that */}
                    < div className='flex flex-1 items-center' > <Icons.hiveauth className='w-8 h-8 mr-4' /> HiveAuth</div >
                </Button >

                <Separator className='w-full my-1' />
                <Button className='py-6 w-full flex justify-start' type='button' variant="ghost">
                    {/* Add logo for that */}
                    <Icons.keyRound className='w-8 h-8 mr-4' /> Hive Keychain extension
                </Button>

                <Separator className='w-full my-1' />

                <Button className='py-6 w-full flex justify-start' type='button' variant="ghost">
                    <Icons.hivesigner className='w-8 h-8 mr-4' /> HiveSigner
                </Button>

                <Button className='mt-8 w-full' type='button' variant="secondary" onClick={() => {
                    // change step here
                    onSetStep(Steps.SAFE_STORAGE_LOGIN);
                }}>
                    <Icons.chevronLeft className='mr-2 h-4 w-4' /> {t("login_form.go_back_button")}
                </Button>
            </div >
        </Step >
    )
}

export default Methods;