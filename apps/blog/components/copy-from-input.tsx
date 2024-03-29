import { Label } from '@radix-ui/react-label';
import { useState } from 'react';
import { Input } from '@ui/components/input';
import { Button } from '@ui/components/button';
import { useTranslation } from 'next-i18next';

export default function ClipboardCopy({ copyText, label }: { copyText: string; label: string }) {
  const { t } = useTranslation('common_blog');
  const [isCopied, setIsCopied] = useState(false);

  async function copyTextToClipboard(text: string) {
    if ('clipboard' in navigator) {
      return await navigator.clipboard.writeText(text);
    } else {
      return document.execCommand('copy', true, text);
    }
  }

  // onClick handler function for the copy button
  const handleCopyClick = () => {
    // Asynchronously call copyTextToClipboard
    copyTextToClipboard(copyText)
      .then(() => {
        // If successful, update the isCopied state value
        setIsCopied(true);
        setTimeout(() => {
          setIsCopied(false);
        }, 1500);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="name">{label}</Label>
      <div className="flex w-full items-center gap-2">
        <Input readOnly value={copyText} className="col-span-3" />
        <Button onClick={handleCopyClick} type="submit" className="w-28">
          {isCopied ? t('post_content.footer.share_form.copied') : t('post_content.footer.share_form.copy')}
        </Button>
      </div>
    </div>
  );
}
