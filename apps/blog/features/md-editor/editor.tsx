import 'md-editor-rt/lib/style.css';
import { useSignerContext } from '@smart-signer/components/signer-provider';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { MdEditor } from 'md-editor-rt';
import { useTheme } from 'next-themes';
import { dropHandler, handleImageUpload } from './utils/upload-image';
import imageUserBlocklist from '@ui/config/lists/image-user-blocklist';

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
      toolbarsExclude={['github', 'previewOnly', 'preview', 'save', 'mermaid', '=']}
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
    />
  );
};

export default DenserMdEditor;
