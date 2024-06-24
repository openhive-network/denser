import { getLogger } from '@ui/lib/logging';
import { Sheet, SheetContent, SheetTrigger } from '@ui/components/sheet';
import { Icons } from '@ui/components/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';

const logger = getLogger('app');

const RocketChatWidget = () => {

    return (
        <Sheet>
            <SheetTrigger asChild>
                <div className="group relative inline-flex w-fit cursor-pointer items-center justify-center">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger type="button">
                                <Icons.messageSquareText className="h-6 w-6 px-0" />
                            </TooltipTrigger>
                            <TooltipContent>Chat</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    {true ? (
                        <div className="absolute bottom-auto left-auto right-0 top-0.5 z-50 inline-block -translate-y-1/2 translate-x-2/4 rotate-0 skew-x-0 skew-y-0 scale-x-100 scale-y-100 whitespace-nowrap rounded-full bg-red-600 px-1.5 py-1 text-center align-baseline text-xs font-bold leading-none text-white">
                            {1}
                        </div>
                    ) : null}
                </div>
            </SheetTrigger>
            <SheetContent
                position="right"
                size="sm"
                className="w-5/6 overflow-auto px-0 pt-12 md:w-2/6"
            >
                <div className="flex flex-col">
                    <p className="m-2">Content</p>
                </div>
            </SheetContent>
        </Sheet>
    );

};

export default RocketChatWidget;
