import { EditorView } from "@codemirror/view";

export function wrapSelection(
  view: EditorView,
  before: string,
  after: string
) {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);
  const replacement = before + selected + after;
  view.dispatch({
    changes: { from, to, insert: replacement },
    selection: {
      anchor: from + before.length,
      head: from + before.length + selected.length,
    },
  });
  view.focus();
}

export function prefixLines(view: EditorView, prefix: string) {
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

export function insertAtCursor(view: EditorView, text: string) {
  const pos = view.state.selection.main.head;
  view.dispatch({
    changes: { from: pos, insert: text },
    selection: { anchor: pos + text.length },
  });
  view.focus();
}

export function cycleHeading(view: EditorView) {
  const { from } = view.state.selection.main;
  const line = view.state.doc.lineAt(from);
  const lineText = line.text;
  const match = lineText.match(/^(#{1,6})\s/);
  if (match) {
    const level = match[1].length;
    if (level < 6) {
      view.dispatch({
        changes: {
          from: line.from,
          to: line.from + level,
          insert: "#".repeat(level + 1),
        },
      });
    } else {
      // Remove all heading hashes
      view.dispatch({
        changes: { from: line.from, to: line.from + level + 1, insert: "" },
      });
    }
  } else {
    view.dispatch({
      changes: { from: line.from, to: line.from, insert: "### " },
    });
  }
  view.focus();
}

export function insertTable(view: EditorView) {
  const template =
    "\n| Column 1 | Column 2 | Column 3 |\n| -------- | -------- | -------- |\n| Text     | Text     | Text     |\n";
  insertAtCursor(view, template);
}

export function numberedList(view: EditorView) {
  const { from, to } = view.state.selection.main;
  const doc = view.state.doc;
  const startLine = doc.lineAt(from).number;
  const endLine = doc.lineAt(to).number;
  const changes: { from: number; to: number; insert: string }[] = [];
  for (let i = startLine; i <= endLine; i++) {
    const line = doc.line(i);
    changes.push({
      from: line.from,
      to: line.from,
      insert: `${i - startLine + 1}. `,
    });
  }
  view.dispatch({ changes });
  view.focus();
}
