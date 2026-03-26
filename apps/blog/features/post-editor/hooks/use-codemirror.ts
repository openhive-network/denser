import { useEffect, useRef } from "react";
import {
  EditorView,
  keymap,
  placeholder as cmPlaceholder,
  ViewUpdate,
  highlightActiveLine,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
} from "@codemirror/view";
import { EditorState, Prec } from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { oneDark } from "@codemirror/theme-one-dark";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import {
  bracketMatching,
  syntaxHighlighting,
  defaultHighlightStyle,
} from "@codemirror/language";
import { wrapSelection } from "../lib/codemirror-commands";
import { lightTheme, darkCompartment, isDarkMode } from "../lib/codemirror-theme";

interface UseCodemirrorConfig {
  placeholder?: string;
  windowheight: number;
  persistedValue: string;
  onChangeRef: React.MutableRefObject<(value: string) => void>;
  pasteHandlerRef: React.MutableRefObject<
    (event: ClipboardEvent, view: EditorView) => boolean
  >;
  isInternalChangeRef: React.MutableRefObject<boolean>;
  lastInputTimeRef: React.MutableRefObject<number>;
}

export function useCodemirror(config: UseCodemirrorConfig) {
  const {
    placeholder,
    windowheight,
    persistedValue,
    onChangeRef,
    pasteHandlerRef,
    isInternalChangeRef,
    lastInputTimeRef,
  } = config;

  const viewRef = useRef<EditorView | null>(null);
  const editorMountRef = useRef<HTMLDivElement>(null);

  // Initialize CodeMirror
  useEffect(() => {
    if (!editorMountRef.current) return;

    const updateListener = EditorView.updateListener.of(
      (update: ViewUpdate) => {
        if (update.docChanged) {
          isInternalChangeRef.current = true;
          lastInputTimeRef.current = Date.now();
          onChangeRef.current(update.state.doc.toString());
        }
      }
    );

    const pasteExtension = EditorView.domEventHandlers({
      paste(event, view) {
        return pasteHandlerRef.current(event, view);
      },
    });

    const unorderedRe = /^(\s*)([-*+])(\s)/;
    const orderedRe = /^(\s*)(\d+[.)])(\s)/;
    const emptyListItemRe = /^(\s{4,})([-*+])\s*$/;
    const INDENT = "    "; // 4 spaces -- minimum for sublist under "1. "

    // Enter on an empty nested list item outdents instead of exiting the list.
    // Detects parent list type (ordered/unordered) and continues accordingly.
    const enterKeymap = Prec.highest(
      keymap.of([
        {
          key: "Enter",
          run: (view) => {
            const { state } = view;
            const line = state.doc.lineAt(state.selection.main.head);
            const m = line.text.match(emptyListItemRe);
            if (m) {
              const [, indent] = m;
              const targetIndent = indent.slice(4);

              // Scan backwards to find the last parent list item at target indent level
              let marker = "- ";
              for (let ln = line.number - 1; ln >= 1; ln--) {
                const prev = state.doc.line(ln).text;
                // Check for ordered list at target indent
                const om = prev.match(
                  new RegExp(`^${targetIndent}(\\d+)[.)]\\s`)
                );
                if (om) {
                  marker = `${Number(om[1]) + 1}. `;
                  break;
                }
                // Check for unordered list at target indent
                if (new RegExp(`^${targetIndent}[-*+]\\s`).test(prev)) {
                  marker = "- ";
                  break;
                }
              }

              const insert = `${targetIndent}${marker}`;
              view.dispatch({
                changes: {
                  from: line.from,
                  to: line.from + line.text.length,
                  insert,
                },
                selection: { anchor: line.from + insert.length },
                userEvent: "input",
              });
              return true;
            }
            return false; // Let markdown keymap handle all other cases
          },
        },
      ])
    );

    const tabKeymap = keymap.of([
      {
        key: "Tab",
        run: (view) => {
          const { state } = view;
          const line = state.doc.lineAt(state.selection.main.head);
          const om = line.text.match(orderedRe);
          if (om) {
            // Ordered -> unordered sub-list: "1. text" -> "    - text"
            const markerStart = line.from + om[1].length;
            const markerEnd = markerStart + om[2].length;
            view.dispatch({
              changes: [
                { from: line.from, insert: INDENT },
                { from: markerStart, to: markerEnd, insert: "-" },
              ],
              userEvent: "input",
            });
          } else if (unorderedRe.test(line.text)) {
            view.dispatch({
              changes: { from: line.from, insert: INDENT },
              userEvent: "input",
            });
          } else {
            view.dispatch(
              state.update(state.replaceSelection("\t"), {
                scrollIntoView: true,
                userEvent: "input",
              })
            );
          }
          return true;
        },
      },
      {
        key: "Shift-Tab",
        run: (view) => {
          const { state } = view;
          const line = state.doc.lineAt(state.selection.main.head);
          if (line.text.startsWith(INDENT)) {
            view.dispatch({
              changes: { from: line.from, to: line.from + 4, insert: "" },
              userEvent: "delete",
            });
          } else if (line.text.startsWith("\t")) {
            view.dispatch({
              changes: { from: line.from, to: line.from + 1, insert: "" },
              userEvent: "delete",
            });
          }
          return true;
        },
      },
      {
        key: "Escape",
        run: (view) => {
          view.contentDOM.blur();
          return true;
        },
      },
    ]);

    const boldItalicKeymap = keymap.of([
      {
        key: "Mod-b",
        run: (view) => {
          wrapSelection(view, "**", "**");
          return true;
        },
      },
      {
        key: "Mod-i",
        run: (view) => {
          wrapSelection(view, "*", "*");
          return true;
        },
      },
      {
        key: "Mod-k",
        run: (view) => {
          const { from, to } = view.state.selection.main;
          const selected = view.state.sliceDoc(from, to);
          const replacement = `[${selected}](url)`;
          view.dispatch({
            changes: { from, to, insert: replacement },
            selection: {
              anchor: from + selected.length + 3,
              head: from + selected.length + 6,
            },
          });
          view.focus();
          return true;
        },
      },
    ]);

    const extensions = [
      enterKeymap,
      tabKeymap,
      boldItalicKeymap,
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
      ]),
      history(),
      markdown({ codeLanguages: languages }),
      markdownLanguage.data.of({
        closeBrackets: {
          brackets: ["(", "[", "{", "'", '"', "`", "```"],
        },
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
        "&": { height: `${windowheight}px` },
        ".cm-scroller": { overflow: "auto", overscrollBehavior: "contain" },
      }),
    ];

    if (placeholder) {
      extensions.push(cmPlaceholder(placeholder));
    }

    const state = EditorState.create({
      doc: persistedValue,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: editorMountRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only run on mount -- all syncing via refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Observe dark mode changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const observer = new MutationObserver(() => {
      const dark = isDarkMode();
      view.dispatch({
        effects: darkCompartment.reconfigure(dark ? oneDark : []),
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Sync persistedValue from parent (form reset, template load, cross-tab sync).
  // Only runs when the editor is NOT focused -- user typing goes through the
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
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: persistedValue,
      },
      selection: {
        anchor: Math.min(anchor, newLen),
        head: Math.min(head, newLen),
      },
    });
  }, [persistedValue]);

  return { viewRef, editorMountRef };
}
