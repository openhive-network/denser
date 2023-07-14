import { Facebook } from 'lucide-react';

export default function FacebookShare({ url }: { url: string }) {
  const href = 'https://hive.blog' + url;
  const openWindow = () => {
    return window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${href}`,
      'fbshare',
      'width=600, height=400, scrollbars=no'
    );
  };
  return (
    <div className="cursor-pointer hover:text-red-500" onClick={openWindow} title="Share on Facebook">
      <Facebook />
    </div>
  );
}
