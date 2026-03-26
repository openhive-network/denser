import { EditorView } from "@codemirror/view";
import { Compartment } from "@codemirror/state";

export const lightTheme = EditorView.theme({
  "&": {
    backgroundColor: "hsl(var(--background))",
    color: "hsl(var(--foreground))",
  },
  ".cm-content": {
    caretColor: "hsl(var(--foreground))",
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    fontSize: "14px",
    lineHeight: "1.6",
  },
  ".cm-cursor": {
    borderLeftColor: "hsl(var(--foreground))",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "hsl(var(--accent))",
  },
  ".cm-gutters": {
    display: "none",
  },
  ".cm-activeLine": {
    backgroundColor: "hsl(var(--accent) / 0.3)",
  },
  ".cm-scroller": {
    overflow: "auto",
  },
  ".cm-matchingBracket": {
    backgroundColor: "hsl(var(--accent))",
    outline: "none",
  },
  ".cm-selectionMatch": {
    backgroundColor: "hsl(var(--accent) / 0.5)",
  },
});

export const darkCompartment = new Compartment();

export function isDarkMode(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}
