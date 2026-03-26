'use client';

import {
  Dispatch,
  FC,
  SetStateAction,
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { EditorView } from '@codemirror/view';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { toast } from '@ui/components/hooks/use-toast';
import { ToastAction } from '@ui/components/toast';
import imageUserBlocklist from '@ui/config/lists/image-user-blocklist';
import { cn } from '@ui/lib/utils';
import { Icons } from '@ui/components/icons';
import { useSignerContext } from '@smart-signer/components/signer-provider';
import { CircleSpinner } from 'react-spinners-kit';
import { useTranslation } from '@/blog/i18n/client';
import { useStorageWithTTL } from '@ui/hooks/useStorageWithTTL';
import { StorageTTL } from '@ui/lib/storage-with-ttl';
import {
  onBatchImageUpload,
  onImageDrop,
  onImagePaste,
  onImageUpload
} from './lib/utils';
import type { BatchFileItem, ProcessingOptions } from './lib/image-processing-types';
import { convertHiveUrlsInText, parseHiveBlogUrl } from './lib/hive-url-converter';
import { getToolbarButtons } from './lib/toolbar-config';
import { useCodemirror } from './hooks/use-codemirror';
import EditorToolbar from './EditorToolbar';

interface MdEditorProps {
  onChange: (value: string) => void;
  persistedValue: string;
  placeholder?: string;
  windowheight: number;
}

const MdEditor: FC<MdEditorProps> = ({ onChange, persistedValue = '', placeholder, windowheight }) => {
  const { t } = useTranslation('common_blog');
  const { user } = useUserClient();
  const { signer } = useSignerContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDrag, setIsDrag] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [insertImg, setInsertImg] = useState('');
  const [convertHiveLinks, setConvertHiveLinks] = useStorageWithTTL<boolean>(
    'convert-hive-links',
    true,
    StorageTTL.PERMANENT
  );
  const [optimizeImages, setOptimizeImages] = useStorageWithTTL<boolean>(
    'optimize-images',
    true,
    StorageTTL.PERMANENT
  );
  const [uploadQueue, setUploadQueue] = useState<BatchFileItem[]>([]);

  const processingOptions: ProcessingOptions = useMemo(
    () => ({ optimize: optimizeImages }),
    [optimizeImages]
  );

  // Track whether content changes are internal (from editor typing) to avoid sync loops
  const isInternalChangeRef = useRef(false);
  const lastInputTimeRef = useRef(0);

  // Refs so paste handler closure always sees latest values
  const convertHiveLinksRef = useRef(convertHiveLinks);
  useEffect(() => {
    convertHiveLinksRef.current = convertHiveLinks;
  }, [convertHiveLinks]);

  const processingOptionsRef = useRef(processingOptions);
  useEffect(() => {
    processingOptionsRef.current = processingOptions;
  }, [processingOptions]);

  // Stable ref for onChange
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Adapter to bridge CodeMirror dispatch with React setState-style callbacks (used for undo)
  const setMarkdownAdapter: Dispatch<SetStateAction<string>> = useCallback((action) => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    const newValue = typeof action === 'function' ? action(current) : action;
    if (newValue === current) return;
    isInternalChangeRef.current = true;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: newValue }
    });
  }, []);

  // Direct CodeMirror insertion that preserves cursor position after the inserted text
  const insertTextAtPosition = useCallback((text: string, pos?: number) => {
    const view = viewRef.current;
    if (!view) return;
    const insertPos = Math.min(pos ?? view.state.doc.length, view.state.doc.length);
    isInternalChangeRef.current = true;
    view.dispatch({
      changes: { from: insertPos, insert: text },
      selection: { anchor: insertPos + text.length }
    });
    view.focus();
  }, []);

  const isBlockedUser = imageUserBlocklist?.includes(user.username);

  // Paste handler (images + Hive URL conversion)
  const handlePaste = useCallback(
    (event: ClipboardEvent, view: EditorView): boolean => {
      if (!event.clipboardData) return false;

      // Check for image paste first
      let hasImage = false;
      for (let i = 0; i < event.clipboardData.items.length; i++) {
        const it = event.clipboardData.items[i];
        if (it.kind === 'file' && it.type.startsWith('image/')) {
          hasImage = true;
          break;
        }
      }
      if (hasImage && !isBlockedUser) {
        event.preventDefault();
        const cursorPos = view.state.selection.main.head;
        onImagePaste(
          event.clipboardData, insertTextAtPosition, signer.username, signer,
          setIsUploading, cursorPos, processingOptionsRef.current
        );
        return true;
      }

      if (!convertHiveLinksRef.current) return false;

      const clipboardText = event.clipboardData.getData('text/plain');
      if (!clipboardText) return false;

      const { from, to } = view.state.selection.main;
      const textBeforeCursor = view.state.sliceDoc(0, from);

      // Detect if pasting inside a markdown link URL position: [text](|cursor)
      const lastLinkOpen = textBeforeCursor.lastIndexOf('](');
      const isInsideMarkdownLinkUrl =
        lastLinkOpen !== -1 && !textBeforeCursor.slice(lastLinkOpen).includes(')');

      let convertedText: string;
      let conversionsCount: number;

      if (isInsideMarkdownLinkUrl) {
        const parsed = parseHiveBlogUrl(clipboardText.trim());
        if (!parsed) return false;
        convertedText = parsed.relativePath;
        conversionsCount = 1;
      } else {
        const result = convertHiveUrlsInText(clipboardText);
        if (!result.hadConversions) return false;
        convertedText = result.convertedText;
        conversionsCount = result.conversionsCount;
      }

      event.preventDefault();

      const currentDoc = view.state.doc.toString();
      const undoValue = currentDoc.slice(0, from) + clipboardText + currentDoc.slice(to);

      isInternalChangeRef.current = true;
      view.dispatch({
        changes: { from, to, insert: convertedText },
        selection: { anchor: from + convertedText.length }
      });

      toast({
        title: t('submit_page.hive_link_converted'),
        description: t('submit_page.hive_link_converted_count', { count: conversionsCount }),
        action: createElement(
          ToastAction,
          {
            altText: t('submit_page.undo'),
            onClick: () => {
              setMarkdownAdapter(undoValue);
            }
          },
          t('submit_page.undo')
        )
      });

      return true;
    },
    [setMarkdownAdapter, signer, isBlockedUser, t]
  );

  // Stable ref for paste handler so extension doesn't need to be re-created
  const pasteHandlerRef = useRef(handlePaste);
  useEffect(() => {
    pasteHandlerRef.current = handlePaste;
  }, [handlePaste]);

  const { viewRef, editorMountRef } = useCodemirror({
    placeholder,
    windowheight,
    persistedValue,
    onChangeRef,
    pasteHandlerRef,
    isInternalChangeRef,
    lastInputTimeRef
  });

  // Image upload handler -- supports single and multi-file selection
  const inputImageHandler = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = event.target.files;
      if (!fileList || fileList.length === 0) return;
      setInsertImg('');
      const cursorPos = viewRef.current?.state.selection.main.head;

      if (fileList.length === 1) {
        await onImageUpload(
          fileList[0], insertTextAtPosition, user.username, signer,
          setIsUploading, cursorPos, processingOptions
        );
      } else {
        const files = Array.from(fileList);
        const items: BatchFileItem[] = files.map((f, i) => ({
          id: `${Date.now()}-${i}`,
          originalFile: f,
          status: 'pending' as const,
          error: null,
          resultUrl: null
        }));
        setUploadQueue(items);

        await onBatchImageUpload(files, insertTextAtPosition, user.username, signer, {
          onFileStart: (i) => {
            setUploadQueue((prev) =>
              prev.map((item, idx) => (idx === i ? { ...item, status: 'processing' } : item))
            );
          },
          onFileProgress: (i, status) => {
            setUploadQueue((prev) =>
              prev.map((item, idx) => (idx === i ? { ...item, status } : item))
            );
          },
          onFileComplete: (i, url) => {
            setUploadQueue((prev) =>
              prev.map((item, idx) => (idx === i ? { ...item, status: 'done', resultUrl: url } : item))
            );
          },
          onFileError: (i, error) => {
            setUploadQueue((prev) =>
              prev.map((item, idx) => (idx === i ? { ...item, status: 'error', error } : item))
            );
          },
          onAllComplete: () => {
            setTimeout(() => setUploadQueue([]), 3000);
          }
        }, cursorPos, processingOptions);
      }
    },
    [insertTextAtPosition, signer, user.username, processingOptions, viewRef]
  );

  // Drag handlers
  const dragHandler = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.type === 'dragenter' || event.type === 'dragover') {
        setIsDrag(true);
      } else if (event.type === 'dragleave') {
        setIsDrag(false);
      }
    },
    []
  );

  const dropHandler = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDrag(false);
      const cursorPos = viewRef.current?.state.selection.main.head;
      await onImageDrop(
        event.dataTransfer, insertTextAtPosition, signer.username, signer,
        setIsUploading, cursorPos, processingOptions
      );
    },
    [insertTextAtPosition, signer, processingOptions, viewRef]
  );

  // Toolbar buttons
  const toolbarButtons = useMemo(() => getToolbarButtons(t), [t]);

  const handleToolbarClick = useCallback(
    (action: (view: EditorView) => void) => {
      const view = viewRef.current;
      if (!view) return;
      action(view);
    },
    [viewRef]
  );

  // Spoiler button handler
  const handleSpoiler = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    const spoilerTemplate = '>! [Click to reveal] Your spoiler content';
    const pos = view.state.selection.main.head;
    view.dispatch({
      changes: { from: pos, insert: spoilerTemplate },
      selection: {
        anchor: pos + spoilerTemplate.indexOf('Your spoiler content'),
        head: pos + spoilerTemplate.length
      }
    });
    view.focus();
  }, [viewRef]);

  // Focus editor on container click
  const focusEditor = useCallback(() => {
    viewRef.current?.focus();
  }, [viewRef]);

  const editorBody = (
    <div
      className={cn(
        'relative cursor-text overflow-hidden rounded-md border border-border',
        { '!bg-red-400/20': isDrag }
      )}
      onClick={focusEditor}
      onDragEnter={isBlockedUser ? undefined : dragHandler}
      onDragOver={isBlockedUser ? undefined : dragHandler}
      onDragLeave={isBlockedUser ? undefined : dragHandler}
      onDrop={isBlockedUser ? undefined : dropHandler}
    >
      <EditorToolbar
        toolbarButtons={toolbarButtons}
        isBlockedUser={isBlockedUser}
        convertHiveLinks={convertHiveLinks}
        setConvertHiveLinks={setConvertHiveLinks}
        optimizeImages={optimizeImages}
        setOptimizeImages={setOptimizeImages}
        onToolbarClick={handleToolbarClick}
        onSpoilerClick={handleSpoiler}
        inputRef={inputRef}
        t={t}
      />
      <div ref={editorMountRef} />
      {isUploading && uploadQueue.length === 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
          <div className="flex items-center gap-2 rounded-md bg-background px-4 py-2 shadow-md">
            <CircleSpinner loading size={18} color="#dc2626" />
            <span className="text-sm font-medium">{t('submit_page.uploading_image')}</span>
          </div>
        </div>
      )}
      {uploadQueue.length > 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
          <div className="max-h-60 w-80 overflow-y-auto rounded-md bg-background p-4 shadow-md">
            <p className="mb-2 text-sm font-medium">
              {t('submit_page.uploading_images', { count: uploadQueue.length })}
            </p>
            {uploadQueue.map((item) => (
              <div key={item.id} className="mb-1.5 flex items-center gap-2 text-xs">
                {item.status === 'done' && (
                  <Icons.check className="h-3 w-3 shrink-0 text-green-600" />
                )}
                {item.status === 'error' && (
                  <Icons.close className="h-3 w-3 shrink-0 text-destructive" />
                )}
                {(item.status === 'pending' || item.status === 'processing' || item.status === 'uploading') && (
                  <CircleSpinner loading size={12} color="#dc2626" />
                )}
                <span className="flex-1 truncate">{item.originalFile.name}</span>
                {item.status === 'error' && (
                  <span className="shrink-0 text-destructive" title={item.error ?? undefined}>
                    {t('submit_page.image_processing_failed')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div ref={containerRef}>
      {!isBlockedUser && (
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept=".jpg,.png,.jpeg,.jfif,.gif,.webp,.heic,.heif"
          multiple
          name="images"
          value={insertImg}
          onChange={inputImageHandler}
        />
      )}
      {editorBody}
    </div>
  );
};

export default MdEditor;
