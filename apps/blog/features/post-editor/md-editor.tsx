'use client';

import '@uiw/react-md-editor/markdown-editor.css';
import {
  FC,
  KeyboardEvent,
  MutableRefObject,
  createElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  ClipboardEvent
} from 'react';
import * as commands from '@uiw/react-md-editor/commands';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import MDEditor, { ICommand, TextAreaTextApi } from '@uiw/react-md-editor';
import { getLogger } from '@ui/lib/logging';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { toast } from '@ui/components/hooks/use-toast';
import { ToastAction } from '@ui/components/toast';
import imageUserBlocklist from '@ui/config/lists/image-user-blocklist';
import { cn } from '@ui/lib/utils';
import { useSignerContext } from '@smart-signer/components/signer-provider';
import { Button } from '@ui/components';
import { CircleSpinner } from 'react-spinners-kit';
import { useTranslation } from '@/blog/i18n/client';
import { useStorageWithTTL } from '@ui/hooks/useStorageWithTTL';
import { StorageTTL } from '@ui/lib/storage-with-ttl';
import { onImageDrop, onImagePaste, onImageUpload } from './lib/utils';
import { convertHiveUrlsInText } from './lib/hive-url-converter';

const logger = getLogger('app');

interface MdEditorProps {
  onChange: (value: string) => void;
  persistedValue: string;
  placeholder?: string;
  windowheight: number;
}

const MdEditor: FC<MdEditorProps> = ({ onChange, persistedValue = '', placeholder, windowheight }) => {
  const { t } = useTranslation('common_blog');
  const { user } = useUserClient();
  const [formValue, setFormValue] = useState<string>(persistedValue);
  const { signer } = useSignerContext();
  const inputRef = useRef<HTMLInputElement>(null) as MutableRefObject<HTMLInputElement>;
  const editorRef = useRef(null);
  const textApiRef = useRef<TextAreaTextApi>(null) as MutableRefObject<TextAreaTextApi>;
  const [isDrag, setIsDrag] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [insertImg, setInsertImg] = useState('');
  const [convertHiveLinks, setConvertHiveLinks] = useStorageWithTTL<boolean>(
    'convert-hive-links',
    true,
    StorageTTL.PERMANENT
  );

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onChange(formValue);
  }, [formValue]);

  useEffect(() => {
    setFormValue(persistedValue);
  }, [persistedValue]);

  // Fix tab navigation: remove toolbar from tab order and override Tab/Shift+Tab
  // so they navigate between form fields instead of inserting indentation
  useEffect(() => {
    if (!containerRef.current) return;

    const toolbar = containerRef.current.querySelector('.w-md-editor-toolbar');
    if (toolbar) {
      toolbar.querySelectorAll<HTMLElement>('button, input, a, [tabindex]').forEach((el) => {
        el.tabIndex = -1;
      });
    }

    let cleanup: (() => void) | undefined;
    const timeoutId = setTimeout(() => {
      const textarea = containerRef.current?.querySelector('.w-md-editor-text-input') as HTMLTextAreaElement;
      if (!textarea) return;

      const handleShiftTab = (e: globalThis.KeyboardEvent) => {
        if (e.key !== 'Tab' || !e.shiftKey) return;
        e.preventDefault();
        e.stopPropagation();

        const focusables = Array.from(
          document.querySelectorAll<HTMLElement>(
            'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"]), ' +
            'textarea:not([disabled]):not([tabindex="-1"]), ' +
            'select:not([disabled]):not([tabindex="-1"]), ' +
            'button:not([disabled]):not([tabindex="-1"])'
          )
        ).filter((el) => el.offsetParent !== null);

        const idx = focusables.indexOf(textarea);
        if (idx > 0) focusables[idx - 1]?.focus();
      };

      textarea.addEventListener('keydown', handleShiftTab, true);
      cleanup = () => textarea.removeEventListener('keydown', handleShiftTab, true);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      cleanup?.();
    };
  }, []);

  const inputImageHandler = useCallback(
    async (event: { target: { files: FileList } }) => {
      if (event.target.files && event.target.files.length === 1) {
        setInsertImg('');
        await onImageUpload(event.target.files[0], setFormValue, user.username, signer, setIsUploading);
      }
    },
    [setFormValue, signer, user.username]
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
      await onImageDrop(event.dataTransfer, setFormValue, signer.username, signer, setIsUploading);
    },
    [setFormValue, signer]
  );

  const pasteHandler = useCallback(
    async (event: ClipboardEvent<HTMLDivElement>) => {
      if (!event.clipboardData) return;

      // Check for image paste first (existing behavior)
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
        await onImagePaste(event.clipboardData, setFormValue, signer.username, signer, setIsUploading);
        return;
      }

      if (!convertHiveLinks) return;

      // Capture textarea ref before the event object is recycled
      const textarea = (event.currentTarget as HTMLElement).querySelector(
        '.w-md-editor-text-input'
      ) as HTMLTextAreaElement;

      // Let the paste happen normally, then replace Hive URLs in the result
      requestAnimationFrame(() => {
        if (!textarea) return;
        const currentValue = textarea.value;
        const result = convertHiveUrlsInText(currentValue);
        if (!result.hadConversions) return;

        const previousValue = currentValue;
        setFormValue(result.convertedText);

        toast({
          title: t('submit_page.hive_link_converted'),
          description: t('submit_page.hive_link_converted_count', { count: result.conversionsCount }),
          action: createElement(
            ToastAction,
            {
              altText: t('submit_page.undo'),
              onClick: () => setFormValue(previousValue)
            },
            t('submit_page.undo')
          )
        });
      });
    },
    [setFormValue, signer, convertHiveLinks, t]
  );

  // Focus the editor textarea when clicking on the editor container
  const focusEditor = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    // Find the textarea within this specific editor instance
    const container = event.currentTarget;
    const textarea = container.querySelector('.w-md-editor-text-input') as HTMLTextAreaElement;
    if (textarea && document.activeElement !== textarea) {
      textarea.focus();
    }
  }, []);

  // Handle Ctrl+Home/End to ensure cursor scrolls into view (Firefox fix)
  const keyDownHandler = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    if (isCtrlOrCmd && (event.key === 'Home' || event.key === 'End')) {
      // Let the default behavior happen first, then scroll
      setTimeout(() => {
        const textarea = document.querySelector('.w-md-editor-text-input') as HTMLTextAreaElement;
        if (textarea) {
          // Create a temporary span at cursor position to scroll to
          const cursorPos = event.key === 'Home' ? 0 : textarea.value.length;
          textarea.setSelectionRange(cursorPos, cursorPos);
          textarea.blur();
          textarea.focus();
          // Ensure the textarea scrolls to show cursor
          if (event.key === 'Home') {
            textarea.scrollTop = 0;
          } else {
            textarea.scrollTop = textarea.scrollHeight;
          }
        }
      }, 0);
    }
  }, []);

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

  const hiveLinksToggle = (): commands.ICommand => ({
    name: 'Convert Hive Links',
    keyCommand: 'convertHiveLinks',
    render: () => {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <label className="flex cursor-pointer select-none items-center gap-1 px-2 text-xs">
                <input
                  type="checkbox"
                  checked={convertHiveLinks}
                  onChange={(e) => setConvertHiveLinks(e.target.checked)}
                  className="cursor-pointer"
                />
                {t('submit_page.convert_hive_links')}
              </label>
            </TooltipTrigger>
            <TooltipContent>{t('submit_page.convert_hive_links_tooltip')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    execute: () => {}
  });

  return !imageUserBlocklist?.includes(user.username) ? (
    <div ref={containerRef}>
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
      <div className="cursor-text relative" onPaste={pasteHandler} onKeyDown={keyDownHandler} onClick={focusEditor}>
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
            extraCommands={[hiveLinksToggle()]}
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
        {isUploading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
            <div className="flex items-center gap-2 rounded-md bg-background px-4 py-2 shadow-md">
              <CircleSpinner loading size={18} color="#dc2626" />
              <span className="text-sm font-medium">{t('submit_page.uploading_image')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  ) : (
    <div ref={containerRef} className="cursor-text" onClick={focusEditor}>
      <MDEditor
        height={windowheight}
        preview="edit"
        value={formValue}
        aria-placeholder={placeholder ?? ''}
        onChange={(value) => {
          setFormValue(value || '');
        }}
        commands={[...(commands.getCommands() as ICommand[]), imgBtn(inputRef), spoilerBtn()]}
        extraCommands={[hiveLinksToggle()]}
        //@ts-ignore
        style={{ '--color-canvas-default': 'var(--background)' }}
      />
    </div>
  );
};

export default MdEditor;
