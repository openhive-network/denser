'use client';

import { useState } from 'react';
import React from 'react';
import MdEditor from '@/blog/components/md-editor';
import Renderer from '@/blog/components/renderer/components/rendererClient';

const Page = () => {
  const [mdSource, setMdSource] = useState('');

  return (
    <div className="px-4 py-8">
      <div className="h-[500px] w-full">
        <MdEditor
          onChange={(value) => setMdSource(value ?? '')}
          persistedValue={mdSource}
          htmlMode={false}
          windowheight={500}
        />
      </div>
      <Renderer mdSource={mdSource} author="" />
    </div>
  );
};

export default Page;
