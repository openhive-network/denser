'use client';

import { FC, useEffect, useMemo } from 'react';
import { extractImagesSrc } from './lib/utils';
import SelectImageItem from './select-image-item';
import { useTranslation } from '@/blog/i18n/client';
import { extractUrlsFromJsonString, extractYouTubeVideoIds } from '@/blog/lib/utils';

interface SelectImageListTypes {
  content: string;
  value: string;
  onChange: (e: string) => void;
}

const SelectImageList: FC<SelectImageListTypes> = ({ content, value, onChange }) => {
  const { t } = useTranslation('common_blog');
  const ytImages = extractYouTubeVideoIds(extractUrlsFromJsonString(content)).map((img) => `youtu-${img}`);
  const images = useMemo(() => [...extractImagesSrc(content), ...ytImages], [content, ytImages]);
  const uniqueImages = Array.from(new Set(images));

  useEffect(() => {
    if (uniqueImages.length === 0 || !uniqueImages.includes(value)) {
      (function () {
        onChange('');
      })();
    }
  }, [onChange, uniqueImages, value]);

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
