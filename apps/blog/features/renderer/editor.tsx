import { MdEditor } from 'md-editor-rt';
import 'md-editor-rt/lib/style.css';
import { useTheme } from 'next-themes';

const DenserMdEditor = ({ text, onChange }: { text: string; onChange: (text: string) => void }) => {
  const { resolvedTheme } = useTheme();

  return (
    <MdEditor
      language="en-US"
      value={text}
      onChange={onChange}
      preview={false}
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      toolbarsExclude={['github', 'previewOnly', 'preview', 'save', 'mermaid', '=']}
    />
  );
};

export default DenserMdEditor;
