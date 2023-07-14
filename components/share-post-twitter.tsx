import { Twitter } from 'lucide-react';

export default function TwitterShare({ title, url }: { title: string; url: string }) {
  const href = 'https://hive.blog' + url;
  const postTitle = title + ' — ' + 'Hive';
  const winWidth = 640;
  const winHeight = 320;
  const winTop = 0;
  const winLeft = 0;
  const q = 'text=' + encodeURIComponent(postTitle) + '&url=' + encodeURIComponent(href);
  const openWindow = () => {
    return window.open(
      'http://twitter.com/share?' + q,
      'Share',
      'top=' + winTop + ',left=' + winLeft + ',toolbar=0,status=0,width=' + winWidth + ',height=' + winHeight
    );
  };
  return (
    <div className="cursor-pointer hover:text-red-500" onClick={openWindow} title="Share on Twitter">
      <Twitter />
    </div>
  );
}
