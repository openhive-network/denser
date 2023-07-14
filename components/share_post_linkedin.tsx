import { Linkedin } from 'lucide-react';

export default function LinkedInShare({ postData }: any) {
  const winWidth = 720;
  const winHeight = 480;
  const winTop = 0;
  const winLeft = 0;
  const title = postData.title + ' — ' + 'Hive';
  const url = 'https://hive.blog' + postData.url;

  const q = 'hive.blog';
  'title=' + encodeURIComponent(title) + '&url=' + encodeURIComponent(url) + '&source=Steemit&mini=true';
  const openWindow = () => {
    return window.open(
      'https://www.linkedin.com/shareArticle?' + q,
      'Share',
      'top=' + winTop + ',left=' + winLeft + ',toolbar=0,status=0,width=' + winWidth + ',height=' + winHeight
    );
  };

  return (
    <div className="cursor-pointer hover:text-red-500" onClick={openWindow} title="Share on LinkedIn">
      <Linkedin />
    </div>
  );
}
