import '@uiw/react-md-editor/markdown-editor.css';
import dynamic from 'next/dynamic';
import {
  Dispatch,
  FC,
  MutableRefObject,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';
import * as commands from '@uiw/react-md-editor/commands';
import env from '@beam-australia/react-env';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { Signer } from '@smart-signer/lib/signer/signer';
import { ICommand, TextAreaTextApi } from '@uiw/react-md-editor';
import { getLogger } from '@ui/lib/logging';
import { useSignerContext } from './common/signer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { useTranslation } from 'next-i18next';
import imageUserBlocklist from '@ui/config/lists/image-user-blocklist';
import { cn } from '@ui/lib/utils';

const logger = getLogger('app');

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

/**
 * Uploads image to Imagehoster, see
 * https://gitlab.syncad.com/hive/imagehoster. Function returns url to
 * image on server or empty string in case of any error.
 *
 * @param {File} file
 * @param {string} username
 * @param {Signer} signer
 * @returns {Promise<string>}
 */
const uploadImg = async (file: File, username: string, signer: Signer): Promise<string> => {
  try {
    let data;

    if (file) {
      const reader = new FileReader();

      data = new Promise((resolve) => {
        reader.addEventListener('load', () => {
          const result = Buffer.from(reader.result!.toString(), 'binary');
          resolve(result);
        });
        reader.readAsBinaryString(file);
      });
    }

    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }

    data = await data;
    const prefix = Buffer.from('ImageSigningChallenge');
    const buf = Buffer.concat([prefix, data as unknown as Uint8Array]);

    const sig = await signer.signChallenge({
      message: buf,
      password: ''
    });

    const postUrl = `${env('IMAGES_ENDPOINT')}${username}/${sig}`;

    const response = await fetch(postUrl, { method: 'POST', body: formData });
    const resJSON = await response.json();
    return resJSON.url;
  } catch (error) {
    logger.error('Error when uploading file %s: %o', file.name, error);
  }
  return '';
};

export const onImageUpload = async (
  file: File,
  setMarkdown: Dispatch<SetStateAction<string>>,
  username: string,
  signer: Signer,
  htmlMode: boolean
) => {
  const url = await uploadImg(file, username, signer);
  if (htmlMode) {
    const insertHTML = insertToTextArea(`<img src="${url}" alt="${file.name}" />`);
    if (!insertHTML) return;
    setMarkdown(insertHTML);
  } else {
    const insertedMarkdown = insertToTextArea(`**![${file.name}](${url})** `);
    if (!insertedMarkdown) return;
    setMarkdown(insertedMarkdown);
  }
};

export const onImageDrop = async (
  dataTransfer: DataTransfer,
  setMarkdown: Dispatch<SetStateAction<string>>,
  username: string,
  signer: Signer,
  htmlMode: boolean
) => {
  const files = [];

  for (let index = 0; index < dataTransfer.items.length; index++) {
    const file = dataTransfer.files.item(index);
    if (file) files.push(file);
  }

  await Promise.all(files.map(async (file) => onImageUpload(file, setMarkdown, username, signer, htmlMode)));
};

const insertToTextArea = (insertString: string) => {
  const textarea = document.querySelector('textarea');
  if (!textarea) {
    return null;
  }

  let sentence = textarea.value;
  const len = sentence.length;
  const pos = textarea.selectionStart;
  const end = textarea.selectionEnd;

  const front = sentence.slice(0, pos);
  const back = sentence.slice(pos, len);

  sentence = front + insertString + back;

  textarea.value = sentence;
  textarea.selectionEnd = end + insertString.length;

  return sentence;
};

interface MdEditorProps {
  onChange: (value: string) => void;
  persistedValue: string;
  placeholder?: string;
  htmlMode: boolean;
  windowheight: number;
}

const MdEditor: FC<MdEditorProps> = ({ onChange, persistedValue = '', placeholder, htmlMode, windowheight }) => {
  const { t } = useTranslation('common_blog');
  const { user } = useUser();
  const [formValue, setFormValue] = useState<string>(persistedValue);
  const { signer } = useSignerContext();
  const inputRef = useRef<HTMLInputElement>(null) as MutableRefObject<HTMLInputElement>;
  const editorRef = useRef(null);
  const textApiRef = useRef<TextAreaTextApi>(null) as MutableRefObject<TextAreaTextApi>;
  const [isDrag, setIsDrag] = useState(false);
  const [insertImg, setInsertImg] = useState('');

  useEffect(() => {
    onChange(formValue);
  }, [formValue]);

  useEffect(() => {
    setFormValue(persistedValue);
  }, [persistedValue]);

  const inputImageHandler = useCallback(
    async (event: { target: { files: FileList } }) => {
      if (event.target.files && event.target.files.length === 1) {
        setInsertImg('');
        await onImageUpload(event.target.files[0], setFormValue, user.username, signer, htmlMode);
      }
    },
    [htmlMode, setFormValue, signer, user.username]
  );

  const dragHandler = (event: { preventDefault: () => void; stopPropagation: () => void; type: string }) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === 'dragenter' || event.type === 'dragover') {
      setIsDrag(true);
    } else if (event.type === 'dragleave') setIsDrag(false);
  };

  const dropHandler = useCallback(
    async (event: {
      preventDefault: () => void;
      stopPropagation: () => void;
      dataTransfer: DataTransfer;
    }) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDrag(false);
      await onImageDrop(event.dataTransfer, setFormValue, signer.username, signer, htmlMode);
    },
    [htmlMode, setFormValue, signer]
  );

  const imgBtn = (inputRef: MutableRefObject<HTMLInputElement>): commands.ICommand => ({
    name: 'Text To Image',
    keyCommand: 'text2image',
    render: (
      command: commands.ICommand,
      disabled: boolean | undefined,
      executeCommand: (arg0: commands.ICommand<string>, arg1: string | undefined) => void
    ) => {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              type="button"
              aria-label={t('submit_page.insert_images_text')}
              disabled={disabled}
              onClick={() => {
                executeCommand(command, command.groupName);
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </TooltipTrigger>
            <TooltipContent>{t('submit_page.insert_images_text')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    execute: (state: commands.ExecuteState, api: TextAreaTextApi) => {
      inputRef.current?.click();
      textApiRef.current = api;
    }
  });

  const editChoice = (inputRef: MutableRefObject<HTMLInputElement>) => [imgBtn(inputRef)];

  return !imageUserBlocklist?.includes(user.username) ? (
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
      <div className="relative">
        <div>
          <MDEditor
            ref={editorRef}
            preview="edit"
            value={formValue}
            aria-placeholder={placeholder ?? ''}
            onChange={(value) => {
              setFormValue(value || '');
            }}
            commands={[...(commands.getCommands() as ICommand[]), imgBtn(inputRef)]}
            extraCommands={[]}
            className={cn({ '!bg-red-400 !bg-opacity-20': isDrag })}
            onDrop={dropHandler}
            onDragEnter={dragHandler}
            onDragOver={dragHandler}
            onDragLeave={dragHandler}
            height={windowheight}
            //@ts-ignore
            style={{ '--color-canvas-default': 'var(--background)' }}
          />
        </div>
      </div>
    </div>
  ) : (
    <MDEditor
      height={windowheight}
      preview="edit"
      value={formValue}
      aria-placeholder={placeholder ?? ''}
      onChange={(value) => {
        setFormValue(value || '');
      }}
      commands={[...(commands.getCommands() as ICommand[]), imgBtn(inputRef)]}
      extraCommands={[]}
      //@ts-ignore
      style={{ '--color-canvas-default': 'var(--background)' }}
    />
  );
};

export default MdEditor;
