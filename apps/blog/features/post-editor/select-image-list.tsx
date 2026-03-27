'use client';

import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { extractImagesSrc } from './lib/utils';
import SelectImageItem from './select-image-item';
import { useTranslation } from '@/blog/i18n/client';
import { extractUrlsFromJsonString, extractYouTubeVideoIds } from '@/blog/lib/utils';

interface SelectImageListTypes {
  content: string;
  value: string;
  onChange: (e: string) => void;
  proxyAuthToken?: string;
}

const SelectImageList: FC<SelectImageListTypes> = ({ content, value, onChange, proxyAuthToken }) => {
  const { t } = useTranslation('common_blog');
  const [debouncedContent, setDebouncedContent] = useState(content);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedContent(content);
    }, 1000);
    return () => clearTimeout(timerRef.current);
  }, [content]);

  const images = useMemo(() => {
    if (!debouncedContent) return [];
    const ytImages = extractYouTubeVideoIds(extractUrlsFromJsonString(debouncedContent)).map((img) => `youtu-${img}`);
    return [...extractImagesSrc(debouncedContent, proxyAuthToken), ...ytImages];
  }, [debouncedContent, proxyAuthToken]);
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
          <SelectImageItem data={e} onChange={onChange} value={value} key={e} proxyAuthToken={proxyAuthToken} />
        ))}
      </div>
    </div>
  ) : null;
};

export default SelectImageList;
