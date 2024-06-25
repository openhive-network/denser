import { getLogger } from '@ui/lib/logging';
import { Sheet, SheetContent, SheetTrigger } from '@ui/components/sheet';
import { Icons } from '@ui/components/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import clsx from 'clsx';

const logger = getLogger('app');

const RocketChatWidget = () => {

    return (
        <Sheet>
            <SheetTrigger asChild>
                <div className="group relative inline-flex w-fit cursor-pointer items-center justify-center">
                    <TooltipProvider>
                        <Tooltip>
                            <div className="fixed block right-10 bottom-10">
                                <TooltipTrigger type="button" aria-label="Open Chat Widget">
                                    <Icons.messageSquareText className="h-12 w-12" />
                                </TooltipTrigger>
                                {true ? (
                                    <div className="absolute bottom-auto left-auto right-0 top-0.5 z-50 inline-block -translate-y-1/2 translate-x-2/4 rotate-0 skew-x-0 skew-y-0 scale-x-100 scale-y-100 whitespace-nowrap rounded-full bg-red-600 px-1.5 py-1 text-center align-baseline text-xs font-bold leading-none text-white">
                                        {1}
                                    </div>
                                ) : null}
                            </div>
                            <TooltipContent>Chat</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
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
