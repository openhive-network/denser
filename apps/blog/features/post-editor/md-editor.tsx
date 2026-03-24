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
import {
  EditorView,
  keymap,
  placeholder as cmPlaceholder,
  ViewUpdate,
  highlightActiveLine,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor
} from '@codemirror/view';
import { EditorState, Compartment, Prec } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { oneDark } from '@codemirror/theme-one-dark';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { bracketMatching, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { getLogger } from '@ui/lib/logging';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
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

const logger = getLogger('app');

interface MdEditorProps {
  onChange: (value: string) => void;
  persistedValue: string;
  placeholder?: string;
  windowheight: number;
}

// --- Toolbar helpers ---

function wrapSelection(view: EditorView, before: string, after: string) {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);
  const replacement = before + selected + after;
  view.dispatch({
    changes: { from, to, insert: replacement },
    selection: { anchor: from + before.length, head: from + before.length + selected.length }
  });
  view.focus();
}

function prefixLines(view: EditorView, prefix: string) {
  const { from, to } = view.state.selection.main;
  const doc = view.state.doc;
  const startLine = doc.lineAt(from).number;
  const endLine = doc.lineAt(to).number;
  const changes: { from: number; to: number; insert: string }[] = [];
  for (let i = startLine; i <= endLine; i++) {
    const line = doc.line(i);
    changes.push({ from: line.from, to: line.from, insert: prefix });
  }
  view.dispatch({ changes });
  view.focus();
}

function insertAtCursor(view: EditorView, text: string) {
  const pos = view.state.selection.main.head;
  view.dispatch({
    changes: { from: pos, insert: text },
    selection: { anchor: pos + text.length }
  });
  view.focus();
}

function cycleHeading(view: EditorView) {
  const { from } = view.state.selection.main;
  const line = view.state.doc.lineAt(from);
  const lineText = line.text;
  const match = lineText.match(/^(#{1,6})\s/);
  if (match) {
    const level = match[1].length;
    if (level < 6) {
      view.dispatch({ changes: { from: line.from, to: line.from + level, insert: '#'.repeat(level + 1) } });
    } else {
      // Remove all heading hashes
      view.dispatch({ changes: { from: line.from, to: line.from + level + 1, insert: '' } });
    }
  } else {
    view.dispatch({ changes: { from: line.from, to: line.from, insert: '### ' } });
  }
  view.focus();
}

function insertTable(view: EditorView) {
  const template =
    '\n| Column 1 | Column 2 | Column 3 |\n| -------- | -------- | -------- |\n| Text     | Text     | Text     |\n';
  insertAtCursor(view, template);
}

function numberedList(view: EditorView) {
  const { from, to } = view.state.selection.main;
  const doc = view.state.doc;
  const startLine = doc.lineAt(from).number;
  const endLine = doc.lineAt(to).number;
  const changes: { from: number; to: number; insert: string }[] = [];
  for (let i = startLine; i <= endLine; i++) {
    const line = doc.line(i);
    changes.push({ from: line.from, to: line.from, insert: `${i - startLine + 1}. ` });
  }
  view.dispatch({ changes });
  view.focus();
}

// --- Toolbar button data ---

interface ToolbarButton {
  name: string;
  icon: React.ReactNode;
  title: string;
  action: (view: EditorView) => void;
  shortcut?: string;
}

const ICON_CLASS = 'h-4 w-4';

function getToolbarButtons(t: (key: string) => string): ToolbarButton[] {
  return [
    { name: 'bold', icon: <Icons.bold className={ICON_CLASS} />, title: 'Bold', action: (v) => wrapSelection(v, '**', '**'), shortcut: 'Ctrl+B' },
    { name: 'italic', icon: <Icons.italic className={ICON_CLASS} />, title: 'Italic', action: (v) => wrapSelection(v, '*', '*'), shortcut: 'Ctrl+I' },
    {
      name: 'strikethrough',
      icon: <Icons.strikethrough className={ICON_CLASS} />,
      title: 'Strikethrough',
      action: (v) => wrapSelection(v, '~~', '~~')
    },
    { name: 'hr', icon: <Icons.horizontalRule className={ICON_CLASS} />, title: 'Horizontal Rule', action: (v) => insertAtCursor(v, '\n---\n') },
    { name: 'title', icon: <Icons.heading className={ICON_CLASS} />, title: 'Heading', action: cycleHeading },
    {
      name: 'link',
      icon: <Icons.link className={ICON_CLASS} />,
      title: 'Link',
      action: (v) => {
        const { from, to } = v.state.selection.main;
        const selected = v.state.sliceDoc(from, to);
        const replacement = `[${selected}](url)`;
        v.dispatch({
          changes: { from, to, insert: replacement },
          selection: {
            anchor: from + selected.length + 3,
            head: from + selected.length + 6
          }
        });
        v.focus();
      },
      shortcut: 'Ctrl+K'
    },
    { name: 'quote', icon: <Icons.quote className={ICON_CLASS} />, title: 'Quote', action: (v) => prefixLines(v, '> ') },
    { name: 'code', icon: <Icons.code className={ICON_CLASS} />, title: 'Inline Code', action: (v) => wrapSelection(v, '`', '`') },
    {
      name: 'codeBlock',
      icon: <Icons.codeBlock className={ICON_CLASS} />,
      title: 'Code Block',
      action: (v) => wrapSelection(v, '```\n', '\n```')
    },
    {
      name: 'image',
      icon: <Icons.imageIcon className={ICON_CLASS} />,
      title: 'Image',
      action: (v) => {
        const { from, to } = v.state.selection.main;
        const selected = v.state.sliceDoc(from, to);
        const replacement = `![${selected || 'alt'}](url)`;
        v.dispatch({
          changes: { from, to, insert: replacement },
          selection: {
            anchor: from + (selected ? selected.length : 3) + 3,
            head: from + (selected ? selected.length : 3) + 6
          }
        });
        v.focus();
      }
    },
    { name: 'table', icon: <Icons.table className={ICON_CLASS} />, title: 'Table', action: insertTable },
    { name: 'unordered-list', icon: <Icons.list className={ICON_CLASS} />, title: 'Unordered List', action: (v) => prefixLines(v, '- ') },
    { name: 'ordered-list', icon: <Icons.listOrdered className={ICON_CLASS} />, title: 'Ordered List', action: numberedList },
    {
      name: 'checked-list',
      icon: <Icons.listChecks className={ICON_CLASS} />,
      title: 'Task List',
      action: (v) => prefixLines(v, '- [ ] ')
    }
  ];
}

// --- Theme ---

const lightTheme = EditorView.theme({
  '&': {
    backgroundColor: 'hsl(var(--background))',
    color: 'hsl(var(--foreground))'
  },
  '.cm-content': {
    caretColor: 'hsl(var(--foreground))',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    fontSize: '14px',
    lineHeight: '1.6'
  },
  '.cm-cursor': {
    borderLeftColor: 'hsl(var(--foreground))'
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: 'hsl(var(--accent))'
  },
  '.cm-gutters': {
    display: 'none'
  },
  '.cm-activeLine': {
    backgroundColor: 'hsl(var(--accent) / 0.3)'
  },
  '.cm-scroller': {
    overflow: 'auto'
  },
  '.cm-matchingBracket': {
    backgroundColor: 'hsl(var(--accent))',
    outline: 'none'
  },
  '.cm-selectionMatch': {
    backgroundColor: 'hsl(var(--accent) / 0.5)'
  }
});

const darkCompartment = new Compartment();

function isDarkMode(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

// --- Component ---

const MdEditor: FC<MdEditorProps> = ({ onChange, persistedValue = '', placeholder, windowheight }) => {
  const { t } = useTranslation('common_blog');
  const { user } = useUserClient();
  const { signer } = useSignerContext();
  const viewRef = useRef<EditorView | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorMountRef = useRef<HTMLDivElement>(null);
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

  // Image upload handler — supports single and multi-file selection
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
    [insertTextAtPosition, signer, user.username, processingOptions]
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
    [insertTextAtPosition, signer, processingOptions]
  );

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

  // Stable ref for onChange
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Initialize CodeMirror
  useEffect(() => {
    if (!editorMountRef.current) return;

    const updateListener = EditorView.updateListener.of((update: ViewUpdate) => {
      if (update.docChanged) {
        isInternalChangeRef.current = true;
        lastInputTimeRef.current = Date.now();
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const pasteExtension = EditorView.domEventHandlers({
      paste(event, view) {
        return pasteHandlerRef.current(event, view);
      }
    });

    const unorderedRe = /^(\s*)([-*+])(\s)/;
    const orderedRe = /^(\s*)(\d+[.)])(\s)/;
    const emptyListItemRe = /^(\s{4,})([-*+])\s*$/;
    const INDENT = '    '; // 4 spaces — minimum for sublist under "1. "

    // Enter on an empty nested list item outdents instead of exiting the list.
    // Detects parent list type (ordered/unordered) and continues accordingly.
    const enterKeymap = Prec.highest(keymap.of([
      {
        key: 'Enter',
        run: (view) => {
          const { state } = view;
          const line = state.doc.lineAt(state.selection.main.head);
          const m = line.text.match(emptyListItemRe);
          if (m) {
            const [, indent] = m;
            const targetIndent = indent.slice(4);

            // Scan backwards to find the last parent list item at target indent level
            let marker = '- ';
            for (let ln = line.number - 1; ln >= 1; ln--) {
              const prev = state.doc.line(ln).text;
              // Check for ordered list at target indent
              const om = prev.match(new RegExp(`^${targetIndent}(\\d+)[.)]\\s`));
              if (om) {
                marker = `${Number(om[1]) + 1}. `;
                break;
              }
              // Check for unordered list at target indent
              if (new RegExp(`^${targetIndent}[-*+]\\s`).test(prev)) {
                marker = '- ';
                break;
              }
            }

            const insert = `${targetIndent}${marker}`;
            view.dispatch({
              changes: { from: line.from, to: line.from + line.text.length, insert },
              selection: { anchor: line.from + insert.length },
              userEvent: 'input'
            });
            return true;
          }
          return false; // Let markdown keymap handle all other cases
        }
      }
    ]));

    const tabKeymap = keymap.of([
      {
        key: 'Tab',
        run: (view) => {
          const { state } = view;
          const line = state.doc.lineAt(state.selection.main.head);
          const om = line.text.match(orderedRe);
          if (om) {
            // Ordered → unordered sub-list: "1. text" → "    - text"
            const markerStart = line.from + om[1].length;
            const markerEnd = markerStart + om[2].length;
            view.dispatch({
              changes: [
                { from: line.from, insert: INDENT },
                { from: markerStart, to: markerEnd, insert: '-' }
              ],
              userEvent: 'input'
            });
          } else if (unorderedRe.test(line.text)) {
            view.dispatch({
              changes: { from: line.from, insert: INDENT },
              userEvent: 'input'
            });
          } else {
            view.dispatch(
              state.update(state.replaceSelection('\t'), { scrollIntoView: true, userEvent: 'input' })
            );
          }
          return true;
        }
      },
      {
        key: 'Shift-Tab',
        run: (view) => {
          const { state } = view;
          const line = state.doc.lineAt(state.selection.main.head);
          if (line.text.startsWith(INDENT)) {
            view.dispatch({
              changes: { from: line.from, to: line.from + 4, insert: '' },
              userEvent: 'delete'
            });
          } else if (line.text.startsWith('\t')) {
            view.dispatch({
              changes: { from: line.from, to: line.from + 1, insert: '' },
              userEvent: 'delete'
            });
          }
          return true;
        }
      },
      {
        key: 'Escape',
        run: (view) => {
          view.contentDOM.blur();
          return true;
        }
      }
    ]);

    const boldItalicKeymap = keymap.of([
      {
        key: 'Mod-b',
        run: (view) => {
          wrapSelection(view, '**', '**');
          return true;
        }
      },
      {
        key: 'Mod-i',
        run: (view) => {
          wrapSelection(view, '*', '*');
          return true;
        }
      },
      {
        key: 'Mod-k',
        run: (view) => {
          const { from, to } = view.state.selection.main;
          const selected = view.state.sliceDoc(from, to);
          const replacement = `[${selected}](url)`;
          view.dispatch({
            changes: { from, to, insert: replacement },
            selection: {
              anchor: from + selected.length + 3,
              head: from + selected.length + 6
            }
          });
          view.focus();
          return true;
        }
      }
    ]);

    const extensions = [
      enterKeymap,
      tabKeymap,
      boldItalicKeymap,
      keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, ...searchKeymap]),
      history(),
      markdown({ codeLanguages: languages }),
      markdownLanguage.data.of({
        closeBrackets: { brackets: ['(', '[', '{', "'", '"', '`', '```'] }
      }),
      closeBrackets(),
      bracketMatching(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      highlightActiveLine(),
      highlightSelectionMatches(),
      drawSelection(),
      dropCursor(),
      rectangularSelection(),
      crosshairCursor(),
      lightTheme,
      darkCompartment.of(isDarkMode() ? oneDark : []),
      updateListener,
      pasteExtension,
      EditorView.lineWrapping,
      EditorView.theme({
        '&': { height: `${windowheight}px` },
        '.cm-scroller': { overflow: 'auto' }
      })
    ];

    if (placeholder) {
      extensions.push(cmPlaceholder(placeholder));
    }

    const state = EditorState.create({
      doc: persistedValue,
      extensions
    });

    const view = new EditorView({
      state,
      parent: editorMountRef.current
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only run on mount — all syncing via refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Observe dark mode changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const observer = new MutationObserver(() => {
      const dark = isDarkMode();
      view.dispatch({
        effects: darkCompartment.reconfigure(dark ? oneDark : [])
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // Sync persistedValue from parent (form reset, template load, cross-tab sync).
  // Only runs when the editor is NOT focused — user typing goes through the
  // updateListener and is never overwritten by the debounced echo from PostForm.
  // Toolbar buttons use tabIndex={-1} so they don't steal focus; they dispatch
  // directly to CodeMirror, not through persistedValue.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    if (view.hasFocus) return;

    const currentDoc = view.state.doc.toString();
    if (currentDoc === persistedValue) return;

    // Preserve cursor position (clamped to new document length)
    const { anchor, head } = view.state.selection.main;
    const newLen = persistedValue.length;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: persistedValue },
      selection: { anchor: Math.min(anchor, newLen), head: Math.min(head, newLen) }
    });
  }, [persistedValue]);

  // Toolbar buttons
  const toolbarButtons = useMemo(() => getToolbarButtons(t), [t]);

  const handleToolbarClick = useCallback(
    (action: (view: EditorView) => void) => {
      const view = viewRef.current;
      if (!view) return;
      action(view);
    },
    []
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
  }, []);

  // Focus editor on container click
  const focusEditor = useCallback(() => {
    viewRef.current?.focus();
  }, []);

  const toolbar = (
    <div
      className="flex flex-wrap items-center gap-0.5 border-b border-border bg-background-secondary/50 px-1 py-1"
      data-testid="editor-toolbar"
      role="toolbar"
    >
      {toolbarButtons.map((btn) => {
        if (btn.name === 'image' && isBlockedUser) return null;
        return (
          <TooltipProvider key={btn.name}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  data-name={btn.name}
                  tabIndex={-1}
                  className="flex h-7 w-7 items-center justify-center rounded text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={() => handleToolbarClick(btn.action)}
                >
                  {btn.icon}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {btn.title}
                {btn.shortcut ? ` (${btn.shortcut})` : ''}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}

      {!isBlockedUser && (
        <>
          <div className="mx-0.5 h-4 w-px bg-border" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  data-name="text2image"
                  tabIndex={-1}
                  className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label={t('submit_page.insert_images_text')}
                  onClick={() => inputRef.current?.click()}
                >
                  <Icons.paperclip className={ICON_CLASS} />
                </button>
              </TooltipTrigger>
              <TooltipContent>{t('submit_page.insert_images_text')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>
      )}

      <div className="mx-0.5 h-4 w-px bg-border" />

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              data-name="spoiler"
              tabIndex={-1}
              className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={handleSpoiler}
            >
              <Icons.eyeOff className={ICON_CLASS} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Spoiler</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="ml-auto" />

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <label className="flex cursor-pointer select-none items-center gap-1 px-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={convertHiveLinks}
                onChange={(e) => setConvertHiveLinks(e.target.checked)}
                className="cursor-pointer"
                tabIndex={-1}
              />
              {t('submit_page.convert_hive_links')}
            </label>
          </TooltipTrigger>
          <TooltipContent>{t('submit_page.convert_hive_links_tooltip')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {!isBlockedUser && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <label className="flex cursor-pointer select-none items-center gap-1 px-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={optimizeImages}
                  onChange={(e) => setOptimizeImages(e.target.checked)}
                  className="cursor-pointer"
                  tabIndex={-1}
                />
                {t('submit_page.optimize_images')}
              </label>
            </TooltipTrigger>
            <TooltipContent>{t('submit_page.optimize_images_tooltip')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );

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
      {toolbar}
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
