import { FC, MouseEvent, ReactNode, RefObject, useMemo } from "react";
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
import { useRovingFocus } from "./hooks/use-roving-focus";

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

interface ToolbarItem {
  name: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  shortcut?: string;
  separatorBefore?: boolean;
}

const BUTTON_CLASS =
  "flex h-7 w-7 items-center justify-center rounded text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring";

const CHECKBOX_LABEL_CLASS =
  "flex cursor-pointer select-none items-center gap-1 px-2 text-xs text-muted-foreground";

// Keeps a mouse click from moving focus out of the editor; keyboard users
// still focus the buttons through the toolbar's roving tabindex.
const preventFocusSteal = (event: MouseEvent<HTMLButtonElement>) =>
  event.preventDefault();

const toAriaKeyShortcuts = (shortcut?: string) =>
  shortcut?.replace("Ctrl", "Control");

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
  const items = useMemo<ToolbarItem[]>(() => {
    const formatting: ToolbarItem[] = toolbarButtons
      .filter((btn) => !(btn.name === "image" && isBlockedUser))
      .map((btn) => ({
        name: btn.name,
        label: btn.title,
        icon: btn.icon,
        shortcut: btn.shortcut,
        onClick: () => onToolbarClick(btn.action),
      }));
    const textToImage: ToolbarItem[] = isBlockedUser
      ? []
      : [
          {
            name: "text2image",
            label: t("submit_page.insert_images_text"),
            icon: <Icons.paperclip className={ICON_CLASS} />,
            onClick: () => inputRef.current?.click(),
            separatorBefore: true,
          },
        ];
    const spoiler: ToolbarItem = {
      name: "spoiler",
      label: t("submit_page.spoiler"),
      icon: <Icons.eyeOff className={ICON_CLASS} />,
      onClick: onSpoilerClick,
      separatorBefore: true,
    };
    return [...formatting, ...textToImage, spoiler];
  }, [toolbarButtons, isBlockedUser, onToolbarClick, onSpoilerClick, inputRef, t]);

  const itemNames = useMemo(() => items.map((item) => item.name), [items]);
  const { getTabIndex, setActiveName, registerItem, onKeyDown } =
    useRovingFocus(itemNames);

  return (
    <div
      className="flex flex-wrap items-center gap-0.5 border-b border-border bg-background-secondary/50 px-1 py-1"
      data-testid="editor-toolbar"
    >
      <div
        className="flex flex-wrap items-center gap-0.5"
        role="toolbar"
        aria-label={t("submit_page.formatting_toolbar")}
        onKeyDown={onKeyDown}
      >
        {items.map((item) => (
          <ToolbarItemButton
            key={item.name}
            item={item}
            tabIndex={getTabIndex(item.name)}
            onFocus={setActiveName}
            registerItem={registerItem}
          />
        ))}
      </div>

      <div className="ml-auto flex flex-wrap items-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <label className={CHECKBOX_LABEL_CLASS}>
                <input
                  type="checkbox"
                  checked={convertHiveLinks}
                  onChange={(e) => setConvertHiveLinks(e.target.checked)}
                  className="cursor-pointer"
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
                <label className={CHECKBOX_LABEL_CLASS}>
                  <input
                    type="checkbox"
                    checked={optimizeImages}
                    onChange={(e) => setOptimizeImages(e.target.checked)}
                    className="cursor-pointer"
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
    </div>
  );
};

interface ToolbarItemButtonProps {
  item: ToolbarItem;
  tabIndex: number;
  onFocus: (name: string) => void;
  registerItem: (name: string, element: HTMLElement | null) => void;
}

const ToolbarItemButton: FC<ToolbarItemButtonProps> = ({
  item,
  tabIndex,
  onFocus,
  registerItem,
}) => (
  <>
    {item.separatorBefore && (
      <div className="mx-0.5 h-4 w-px bg-border" aria-hidden="true" />
    )}
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            data-name={item.name}
            ref={(element) => registerItem(item.name, element)}
            tabIndex={tabIndex}
            className={BUTTON_CLASS}
            aria-label={item.label}
            aria-keyshortcuts={toAriaKeyShortcuts(item.shortcut)}
            onMouseDown={preventFocusSteal}
            onFocus={() => onFocus(item.name)}
            onClick={item.onClick}
          >
            {item.icon}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          {item.label}
          {item.shortcut ? ` (${item.shortcut})` : ""}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </>
);

export default EditorToolbar;
