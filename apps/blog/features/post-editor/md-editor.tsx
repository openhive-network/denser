'use client';

import '@uiw/react-md-editor/markdown-editor.css';
import {
  Dispatch,
  FC,
  MutableRefObject,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
  ClipboardEvent
} from 'react';
import * as commands from '@uiw/react-md-editor/commands';
import { useUser } from '@smart-signer/lib/auth/use-user';
import MDEditor, { ICommand, TextAreaTextApi } from '@uiw/react-md-editor';
import { getLogger } from '@ui/lib/logging';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import imageUserBlocklist from '@ui/config/lists/image-user-blocklist';
import { cn } from '@ui/lib/utils';
import { useSignerContext } from '@smart-signer/components/signer-provider';
import { Button } from '@ui/components';
import { useTranslation } from '@/blog/i18n/client';
import { onImageDrop, onImagePaste, onImageUpload } from './lib/utils';

const logger = getLogger('app');

interface MdEditorProps {
  onChange: (value: string) => void;
  persistedValue: string;
  placeholder?: string;
  htmlMode: boolean;
  windowheight: number;
}

const MdEditor: FC<MdEditorProps> = ({
  onChange,
  persistedValue = '',
  placeholder,
  htmlMode,
  windowheight
}) => {
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

  const pasteHandler = useCallback(
    async (event: ClipboardEvent<HTMLDivElement>) => {
      if (!event.clipboardData) return;

      let hasImage = false;
      for (let i = 0; i < event.clipboardData.items.length; i++) {
        const it = event.clipboardData.items[i];
        if (it.kind === 'file' && it.type.startsWith('image/')) {
          hasImage = true;
          break;
        }
      }
      if (hasImage) {
        event.preventDefault();
        event.stopPropagation();
        await onImagePaste(event.clipboardData, setFormValue, signer.username, signer, htmlMode);
      }
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

  const spoilerBtn = (): commands.ICommand => ({
    name: 'Add Spoiler',
    keyCommand: 'spoiler',
    render: (
      command: commands.ICommand,
      disabled: boolean | undefined,
      executeCommand: (arg0: commands.ICommand<string>, arg1: string | undefined) => void
    ) => {
      return (
        <Button
          variant="basic"
          onClick={() => executeCommand(command, command.groupName)}
          disabled={disabled}
        >
          Spoiler
        </Button>
      );
    },
    execute: (_: commands.ExecuteState, api: TextAreaTextApi) => {
      const spoilerTemplate = '>! [Click to reveal] Your spoiler content';
      const newState = api.replaceSelection(spoilerTemplate);
      api.setSelectionRange({
        start: newState.selection.start + spoilerTemplate.indexOf('Your spoiler content'),
        end: newState.selection.end
      });
    }
  });

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
      <div className="relative" onPaste={pasteHandler}>
        <div>
          <MDEditor
            ref={editorRef}
            preview="edit"
            value={formValue}
            aria-placeholder={placeholder ?? ''}
            onChange={(value) => {
              setFormValue(value || '');
            }}
            commands={[...(commands.getCommands() as ICommand[]), imgBtn(inputRef), spoilerBtn()]}
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
      commands={[...(commands.getCommands() as ICommand[]), imgBtn(inputRef), spoilerBtn()]}
      extraCommands={[]}
      //@ts-ignore
      style={{ '--color-canvas-default': 'var(--background)' }}
    />
  );
};

export default MdEditor;
