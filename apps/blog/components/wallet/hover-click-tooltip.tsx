'use client';

import React, { FC, ReactNode, useState } from 'react';
import { Button } from '@ui/components/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import clsx from 'clsx';

interface HoverClickTooltipProps {
  triggerChildren: ReactNode;
  children: ReactNode;
  buttonStyle?: string;
  contentStyle?: string;
}

const HoverClickTooltip: FC<HoverClickTooltipProps> = ({
  triggerChildren,
  children,
  buttonStyle,
  contentStyle
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleMouseEnter = () => setIsOpen(true);
  const handleMouseLeave = () => setIsOpen(false);
  const handleClick = () => setIsOpen((prev) => !prev);

  return (
    <TooltipProvider>
      <Tooltip open={isOpen}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            className={clsx('h-fit p-0', buttonStyle)}
            onMouseEnter={handleMouseEnter}
            onClick={handleClick}
          >
            {triggerChildren}
          </Button>
        </TooltipTrigger>
        <TooltipContent onMouseLeave={handleMouseLeave} className={clsx(contentStyle)}>
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default HoverClickTooltip;
