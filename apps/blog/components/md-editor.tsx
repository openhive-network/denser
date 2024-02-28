import '@uiw/react-md-editor/markdown-editor.css';
import dynamic from 'next/dynamic';
import {
  ChangeEvent,
  Dispatch,
  MutableRefObject,
  SetStateAction,
  useCallback,
  useRef,
  useState
} from 'react';
import * as commands from '@uiw/react-md-editor/commands';
import { useTheme } from 'next-themes';
import { ContextStore } from '@uiw/react-md-editor';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

export const uploadImg = () =>
  'https://images.unsplash.com/photo-1689671439720-47c45b6a7a74?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxlZGl0b3JpYWwtZmVlZHw1fHx8ZW58MHx8fHx8&auto=format&fit=crop&w=500&q=60';

export const onImageUpload = async (file: string, api: any) => {
  // const url = await uploadImg(file);
  const url = await uploadImg();

  const insertedMarkdown =
    `**![](${url})**` +
    `<!--rehype:style=display: flex; justify-content: center; width: 100%; max-width: 500px; margin: auto; margin-top: 4px; margin-bottom: 4px; -->`;
  if (!insertedMarkdown) return;

  api.replaceSelection(insertedMarkdown);
};

export const onImageUpload_DnD = async (
  file: any,
  setMarkdown: { (value: SetStateAction<string>): void; (arg0: (prev: any) => string): void }
) => {
  // const url = await uploadImg(file);
  const url = await uploadImg();

  const insertedMarkdown =
    `**![](${url})**` +
    `<!--rehype:style=display: flex; justify-content: center; width: 100%; max-width: 500px; margin: auto; margin-top: 4px; margin-bottom: 4px; -->`;
  if (!insertedMarkdown) return;

  setMarkdown((prev) => prev + insertedMarkdown);
};

export const onImageDrop = async (
  dataTransfer: { items: string | any[]; files: { item: (arg0: number) => any } },
  setMarkdown: Dispatch<SetStateAction<string>>
) => {
  const files = [];

  for (let index = 0; index < dataTransfer.items.length; index++) {
    const file = dataTransfer.files.item(index);
    if (file) files.push(file);
  }

  await Promise.all(files.map(async (file) => onImageUpload_DnD(file, setMarkdown)));
};

const MdEditor = (data: {
  data: {
    value: string | undefined;
    onChange:
      | ((
          value?: string | undefined,
          event?: ChangeEvent<HTMLTextAreaElement> | undefined,
          state?: ContextStore | undefined
        ) => void)
      | undefined;
  };
}) => {
  const { resolvedTheme } = useTheme();

  const inputRef = useRef(null);
  const editorRef = useRef(null);
  const textApiRef = useRef(null);
  const [isDrag, setIsDrag] = useState(false);
  const [insertImg, setInsertImg] = useState('');

  const inputImageHandler = useCallback(async (event: { target: { files: string | any[] } }) => {
    if (event.target.files && event.target.files.length === 1) {
      setInsertImg('');
      await onImageUpload(event.target.files[0], textApiRef.current);
    }
  }, []);

  // Drag and Drop
  const startDragHandler = (event: {
    preventDefault: () => void;
    stopPropagation: () => void;
    type: string;
  }) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === 'dragenter') setIsDrag(true);
  };

  const dragHandler = (event: { preventDefault: () => void; stopPropagation: () => void; type: string }) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === 'dragenter' || event.type === 'dragover') {
      setIsDrag(true);
    } else if (event.type === 'dragleave') setIsDrag(false);
  };

  const dropHandler = useCallback(
    async (event: { preventDefault: () => void; stopPropagation: () => void; dataTransfer: any }) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDrag(false);
      await onImageDrop(event.dataTransfer, () => data.data.onChange);
    },
    []
  );

  const imgBtn = (inputRef: any, textApiRef: MutableRefObject<null>) => ({
    name: 'Text To Image',
    keyCommand: 'text2image',
    render: (
      command: commands.ICommand,
      disabled: boolean | undefined,
      executeCommand: (arg0: commands.ICommand<string>, arg1: string | undefined) => void
    ) => {
      return (
        <button
          type="button"
          aria-label="Insert title3"
          disabled={disabled}
          onClick={() => {
            executeCommand(command, command.groupName);
          }}
        >
          <svg width="12" height="12" viewBox="0 0 20 20">
            <path
              fill="currentColor"
              d="M15 9c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4-7H1c-.55 0-1 .45-1 1v14c0 .55.45 1 1 1h18c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1zm-1 13l-6-5-2 2-4-5-4 8V4h16v11z"
            ></path>
          </svg>
        </button>
      );
    },
    execute: (state: any, api: null) => {
      inputRef.current.click();
      textApiRef.current = api;
    }
  });

  const editChoice = (inputRef: MutableRefObject<null>, textApiRef: MutableRefObject<null>) => [
    imgBtn(inputRef, textApiRef)
  ];

  return (
    <div>
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept=".jpg,.png,.jpeg,.jfif,.gif"
        name="avatar"
        value={insertImg}
        //@ts-ignore
        onChange={inputImageHandler}
      />
      <div onDragEnter={startDragHandler} className="relative">
        <div data-color-mode={resolvedTheme === 'dark' ? 'dark' : 'light'}>
          <MDEditor
            ref={editorRef}
            value={data.data.value}
            //@ts-ignore
            onChange={data.data.onChange}
            commands={[...(commands.getCommands() as any), imgBtn(inputRef, textApiRef)]}
          />
        </div>
        {isDrag && (
          <div
            className="absolute bottom-0 left-0 right-0 top-0 h-full w-full bg-red-400 bg-opacity-20 "
            onDrop={dropHandler}
            onDragEnter={dragHandler}
            onDragOver={dragHandler}
            onDragLeave={dragHandler}
          ></div>
        )}
      </div>
    </div>
  );
};

export default MdEditor;
