import { Button } from '@ui/components';
import { proxifyImageUrl } from '@ui/lib/old-profixy';
import clsx from 'clsx';
import React, { useState } from 'react';
import { imagePicker } from './lib/utils';

interface SelectImageItemTypes {
  data: string;
  onChange: (data: string) => void;
  value: string;
}

const SelectImageItem: React.FC<SelectImageItemTypes> = ({ data, onChange, value }) => {
  const [invalidImages, setInvalidImages] = useState(false);

  return (
    <div className="group">
      <Button
        type="button"
        variant="basic"
        className={clsx(
          'relative flex h-fit w-[62px] items-center overflow-hidden rounded-none bg-transparent p-0 group-hover:h-[80px] group-hover:w-[130px]',
          { hidden: invalidImages }
        )}
        onClick={() => onChange(data)}
      >
        <img
          src={proxifyImageUrl(imagePicker(data), true)}
          alt="cover img"
          onError={() => setInvalidImages(true)}
          loading="lazy"
          className={clsx(
            'h-[60px] w-[60px] object-cover p-1 contrast-50 ease-out group-hover:h-full  group-hover:w-full group-hover:contrast-100 group-hover:duration-700 group-hover:ease-in-out',
            {
              'bg-destructive contrast-100': value === data,
              hidden: invalidImages
            }
          )}
        />
      </Button>
    </div>
  );
};

export default SelectImageItem;
