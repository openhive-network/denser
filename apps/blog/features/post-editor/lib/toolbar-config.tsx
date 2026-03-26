import { EditorView } from "@codemirror/view";
import { Icons } from "@ui/components/icons";
import {
  wrapSelection,
  prefixLines,
  insertAtCursor,
  cycleHeading,
  insertTable,
  numberedList,
} from "./codemirror-commands";

export interface ToolbarButton {
  name: string;
  icon: React.ReactNode;
  title: string;
  action: (view: EditorView) => void;
  shortcut?: string;
}

const ICON_CLASS = "h-4 w-4";

export { ICON_CLASS };

export function getToolbarButtons(
  t: (key: string) => string
): ToolbarButton[] {
  return [
    {
      name: "bold",
      icon: <Icons.bold className={ICON_CLASS} />,
      title: "Bold",
      action: (v) => wrapSelection(v, "**", "**"),
      shortcut: "Ctrl+B",
    },
    {
      name: "italic",
      icon: <Icons.italic className={ICON_CLASS} />,
      title: "Italic",
      action: (v) => wrapSelection(v, "*", "*"),
      shortcut: "Ctrl+I",
    },
    {
      name: "strikethrough",
      icon: <Icons.strikethrough className={ICON_CLASS} />,
      title: "Strikethrough",
      action: (v) => wrapSelection(v, "~~", "~~"),
    },
    {
      name: "hr",
      icon: <Icons.horizontalRule className={ICON_CLASS} />,
      title: "Horizontal Rule",
      action: (v) => insertAtCursor(v, "\n---\n"),
    },
    {
      name: "title",
      icon: <Icons.heading className={ICON_CLASS} />,
      title: "Heading",
      action: cycleHeading,
    },
    {
      name: "link",
      icon: <Icons.link className={ICON_CLASS} />,
      title: "Link",
      action: (v) => {
        const { from, to } = v.state.selection.main;
        const selected = v.state.sliceDoc(from, to);
        const replacement = `[${selected}](url)`;
        v.dispatch({
          changes: { from, to, insert: replacement },
          selection: {
            anchor: from + selected.length + 3,
            head: from + selected.length + 6,
          },
        });
        v.focus();
      },
      shortcut: "Ctrl+K",
    },
    {
      name: "quote",
      icon: <Icons.quote className={ICON_CLASS} />,
      title: "Quote",
      action: (v) => prefixLines(v, "> "),
    },
    {
      name: "code",
      icon: <Icons.code className={ICON_CLASS} />,
      title: "Inline Code",
      action: (v) => wrapSelection(v, "`", "`"),
    },
    {
      name: "codeBlock",
      icon: <Icons.codeBlock className={ICON_CLASS} />,
      title: "Code Block",
      action: (v) => wrapSelection(v, "```\n", "\n```"),
    },
    {
      name: "image",
      icon: <Icons.imageIcon className={ICON_CLASS} />,
      title: "Image",
      action: (v) => {
        const { from, to } = v.state.selection.main;
        const selected = v.state.sliceDoc(from, to);
        const replacement = `![${selected || "alt"}](url)`;
        v.dispatch({
          changes: { from, to, insert: replacement },
          selection: {
            anchor: from + (selected ? selected.length : 3) + 3,
            head: from + (selected ? selected.length : 3) + 6,
          },
        });
        v.focus();
      },
    },
    {
      name: "table",
      icon: <Icons.table className={ICON_CLASS} />,
      title: "Table",
      action: insertTable,
    },
    {
      name: "unordered-list",
      icon: <Icons.list className={ICON_CLASS} />,
      title: "Unordered List",
      action: (v) => prefixLines(v, "- "),
    },
    {
      name: "ordered-list",
      icon: <Icons.listOrdered className={ICON_CLASS} />,
      title: "Ordered List",
      action: numberedList,
    },
    {
      name: "checked-list",
      icon: <Icons.listChecks className={ICON_CLASS} />,
      title: "Task List",
      action: (v) => prefixLines(v, "- [ ] "),
    },
  ];
}
