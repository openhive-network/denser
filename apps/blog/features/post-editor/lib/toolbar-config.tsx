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
      title: t("submit_page.toolbar.bold"),
      action: (v) => wrapSelection(v, "**", "**"),
      shortcut: "Ctrl+B",
    },
    {
      name: "italic",
      icon: <Icons.italic className={ICON_CLASS} />,
      title: t("submit_page.toolbar.italic"),
      action: (v) => wrapSelection(v, "*", "*"),
      shortcut: "Ctrl+I",
    },
    {
      name: "strikethrough",
      icon: <Icons.strikethrough className={ICON_CLASS} />,
      title: t("submit_page.toolbar.strikethrough"),
      action: (v) => wrapSelection(v, "~~", "~~"),
    },
    {
      name: "hr",
      icon: <Icons.horizontalRule className={ICON_CLASS} />,
      title: t("submit_page.toolbar.horizontal_rule"),
      action: (v) => insertAtCursor(v, "\n---\n"),
    },
    {
      name: "title",
      icon: <Icons.heading className={ICON_CLASS} />,
      title: t("submit_page.toolbar.heading"),
      action: cycleHeading,
    },
    {
      name: "link",
      icon: <Icons.link className={ICON_CLASS} />,
      title: t("submit_page.toolbar.link"),
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
      title: t("submit_page.toolbar.quote"),
      action: (v) => prefixLines(v, "> "),
    },
    {
      name: "code",
      icon: <Icons.code className={ICON_CLASS} />,
      title: t("submit_page.toolbar.inline_code"),
      action: (v) => wrapSelection(v, "`", "`"),
    },
    {
      name: "codeBlock",
      icon: <Icons.codeBlock className={ICON_CLASS} />,
      title: t("submit_page.toolbar.code_block"),
      action: (v) => wrapSelection(v, "```\n", "\n```"),
    },
    {
      name: "image",
      icon: <Icons.imageIcon className={ICON_CLASS} />,
      title: t("submit_page.toolbar.image"),
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
      title: t("submit_page.toolbar.table"),
      action: insertTable,
    },
    {
      name: "unordered-list",
      icon: <Icons.list className={ICON_CLASS} />,
      title: t("submit_page.toolbar.unordered_list"),
      action: (v) => prefixLines(v, "- "),
    },
    {
      name: "ordered-list",
      icon: <Icons.listOrdered className={ICON_CLASS} />,
      title: t("submit_page.toolbar.ordered_list"),
      action: numberedList,
    },
    {
      name: "checked-list",
      icon: <Icons.listChecks className={ICON_CLASS} />,
      title: t("submit_page.toolbar.task_list"),
      action: (v) => prefixLines(v, "- [ ] "),
    },
  ];
}
