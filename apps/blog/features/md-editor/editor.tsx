import 'md-editor-rt/lib/style.css';
import { useSignerContext } from '@smart-signer/components/signer-provider';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { config, MdEditor } from 'md-editor-rt';
import { useTheme } from 'next-themes';
import { dropHandler, handleImageUpload } from './utils/upload-image';
import imageUserBlocklist from '@ui/config/lists/image-user-blocklist';
import { Emoji } from '@vavt/rt-extension';
import { Mark } from '@vavt/rt-extension';
import '@vavt/rt-extension/lib/asset/Emoji.css';
import '@vavt/rt-extension/lib/asset/Mark.css';
import { Highlighter } from 'lucide-react';

config({
  codeMirrorExtensions(_theme, extensions) {
    const newExtensions = [...extensions];
    newExtensions.pop(); // Remove CompartmentInstance extension
    return newExtensions;
  },
  editorConfig: {
    languageUserDefined: {
      'en-US': {
        toolbarTips: {
          bold: 'bold',
          underline: 'underline',
          italic: 'italic',
          strikeThrough: 'strikeThrough',
          title: 'title',
          sub: 'subscript',
          sup: 'superscript',
          quote: 'quote',
          unorderedList: 'unordered list',
          orderedList: 'ordered list',
          codeRow: 'inline code',
          code: 'block-level code',
          link: 'link',
          image: 'image',
          table: 'table',
          mermaid: 'mermaid',
          katex: 'formula',
          revoke: 'revoke',
          next: 'undo revoke',
          save: 'save',
          prettier: 'prettier',
          pageFullscreen: 'fullscreen in page',
          fullscreen: 'fullscreen',
          preview: 'preview',
          previewOnly: 'previewOnly',
          htmlPreview: 'html preview',
          catalog: 'catalog',
          github: 'source code'
        },
        titleItem: {
          h1: 'Lv1 Heading',
          h2: 'Lv2 Heading',
          h3: 'Lv3 Heading',
          h4: 'Lv4 Heading',
          h5: 'Lv5 Heading',
          h6: 'Lv6 Heading'
        },
        imgTitleItem: {
          link: 'Add Img Link',
          upload: 'Upload Img',
          clip2upload: 'Crop Img to Upload'
        },
        linkModalTips: {
          linkTitle: 'Add Link',
          imageTitle: 'Add Image',
          descLabel: 'Desc:',
          descLabelPlaceHolder: 'Enter a description...',
          urlLabel: 'Link:',
          urlLabelPlaceHolder: 'Enter a link...',
          buttonOK: 'OK'
        },
        clipModalTips: {
          title: 'Crop Image',
          buttonUpload: 'Upload'
        },
        copyCode: {
          text: 'Copy',
          successTips: 'Copied!',
          failTips: 'Copy failed!'
        },
        mermaid: {
          flow: 'flow',
          sequence: 'sequence',
          gantt: 'gantt',
          class: 'class',
          state: 'state',
          pie: 'pie',
          relationship: 'relationship',
          journey: 'journey'
        },
        katex: {
          inline: 'inline',
          block: 'block'
        },
        footer: {
          markdownTotal: 'Word Count',
          scrollAuto: 'Scroll Auto'
        }
      }
    }
  }
});

const DenserMdEditor = ({ text, onChange }: { text: string; onChange: (text: string) => void }) => {
  const { resolvedTheme } = useTheme();
  const { user } = useUser();
  const { signer } = useSignerContext();
  const isUserBlocked = imageUserBlocklist.includes(user?.username || '');

  return (
    <MdEditor
      language="en-US"
      value={text}
      onChange={onChange}
      preview={false}
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      defToolbars={[
        <Emoji key="Emoji" trigger={<span>😀</span>} />,
        <Mark
          key="Mark"
          trigger={
            <span>
              <Highlighter className="h-4 w-4" />
            </span>
          }
        />
      ]}
      toolbars={[
        'title',
        'bold',
        'underline',
        'italic',
        '-',
        'strikeThrough',
        'sub',
        'sup',
        'quote',
        'unorderedList',
        'orderedList',
        'task',
        '-',
        'codeRow',
        'code',
        'link',
        'image',
        'table',
        'katex',
        '-',
        0,
        1,
        '-',
        'revoke',
        'next',
        'pageFullscreen',
        'fullscreen',
        'htmlPreview',
        'catalog'
      ]}
      onUploadImg={(files) =>
        !isUserBlocked
          ? handleImageUpload(files, user.username, signer, onChange, text)
          : alert('Image uploads are blocked for this user.')
      }
      onDrop={(event) =>
        !isUserBlocked
          ? dropHandler(user.username, signer, event, onChange, text)
          : alert('Image uploads are blocked for this user.')
      }
      onError={(err) => {
        console.error('MdEditor error:', err);
      }}
    />
  );
};

export default DenserMdEditor;
