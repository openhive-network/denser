import { FC, useMemo } from 'react';
import { extractImagesSrc } from '../lib/utils';
import SelectImageItem from './select-image-item';
import { useTranslation } from 'next-i18next';

interface SelectImageListTypes {
  content: string;
  value: string;
  onChange: (e: string) => void;
}

const SelectImageList: FC<SelectImageListTypes> = ({ content, value, onChange }) => {
  const { t } = useTranslation('common_blog');
  const images = useMemo(() => extractImagesSrc(content), [content]);
  const uniqueImages = Array.from(new Set(images));

  return uniqueImages.length > 0 ? (
    <div>
      <span>{t('submit_page.cover_image')}</span>
      <div className="flex flex-wrap">
        {uniqueImages.map((e) => (
          <SelectImageItem data={e} onChange={onChange} value={value} key={e} />
        ))}
      </div>
    </div>
  ) : null;
};

export default SelectImageList;
