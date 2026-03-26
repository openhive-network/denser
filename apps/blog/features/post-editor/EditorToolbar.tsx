import { FC, RefObject } from "react";
import { EditorView } from "@codemirror/view";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { Icons } from "@ui/components/icons";
import type { ToolbarButton } from "./lib/toolbar-config";
import { ICON_CLASS } from "./lib/toolbar-config";

interface EditorToolbarProps {
  toolbarButtons: ToolbarButton[];
  isBlockedUser: boolean;
  convertHiveLinks: boolean;
  setConvertHiveLinks: (value: boolean) => void;
  optimizeImages: boolean;
  setOptimizeImages: (value: boolean) => void;
  onToolbarClick: (action: (view: EditorView) => void) => void;
  onSpoilerClick: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
  t: (key: string) => string;
}

const EditorToolbar: FC<EditorToolbarProps> = ({
  toolbarButtons,
  isBlockedUser,
  convertHiveLinks,
  setConvertHiveLinks,
  optimizeImages,
  setOptimizeImages,
  onToolbarClick,
  onSpoilerClick,
  inputRef,
  t,
}) => {
  return (
    <div
      className="flex flex-wrap items-center gap-0.5 border-b border-border bg-background-secondary/50 px-1 py-1"
      data-testid="editor-toolbar"
      role="toolbar"
    >
      {toolbarButtons.map((btn) => {
        if (btn.name === "image" && isBlockedUser) return null;
        return (
          <TooltipProvider key={btn.name}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  data-name={btn.name}
                  tabIndex={-1}
                  className="flex h-7 w-7 items-center justify-center rounded text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={() => onToolbarClick(btn.action)}
                >
                  {btn.icon}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {btn.title}
                {btn.shortcut ? ` (${btn.shortcut})` : ""}
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
                  aria-label={t("submit_page.insert_images_text")}
                  onClick={() => inputRef.current?.click()}
                >
                  <Icons.paperclip className={ICON_CLASS} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {t("submit_page.insert_images_text")}
              </TooltipContent>
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
              onClick={onSpoilerClick}
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
              {t("submit_page.convert_hive_links")}
            </label>
          </TooltipTrigger>
          <TooltipContent>
            {t("submit_page.convert_hive_links_tooltip")}
          </TooltipContent>
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
                {t("submit_page.optimize_images")}
              </label>
            </TooltipTrigger>
            <TooltipContent>
              {t("submit_page.optimize_images_tooltip")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

export default EditorToolbar;
