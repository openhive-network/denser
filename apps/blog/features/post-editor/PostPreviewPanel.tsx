"use client";

import { Dispatch, RefObject, SetStateAction } from "react";
import clsx from "clsx";
import { Link } from "@hive/ui";
import { Button } from "@hive/ui/components/button";
import { Icons } from "@ui/components/icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@ui/components/tooltip";
import { useTranslation } from "@/blog/i18n/client";
import RendererContainer from "@/blog/features/post-rendering/rendererContainer";
import { postClassName } from "@/blog/features/post-editor/lib/utils";

interface PostPreviewPanelProps {
  preview: boolean;
  sideBySide: boolean;
  syncScroll: boolean;
  setSyncScroll: Dispatch<SetStateAction<boolean>>;
  previewContainerRef: RefObject<HTMLDivElement>;
  previewContent: string | undefined;
  proxyAuthToken: string | undefined;
}

export function PostPreviewPanel({
  preview,
  sideBySide,
  syncScroll,
  setSyncScroll,
  previewContainerRef,
  previewContent,
  proxyAuthToken,
}: PostPreviewPanelProps) {
  const { t } = useTranslation("common_blog");

  return (
    <div
      className={clsx("relative flex flex-col lg:w-1/2", {
        hidden: !preview,
        "lg:w-full": !sideBySide,
        "h-[80vh]": sideBySide,
      })}
      data-testid="preview-container"
    >
      {/* Floating sync scroll button */}
      {sideBySide && (
        <div
          className="group absolute left-[-7px] top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 lg:block"
          data-testid="sync-scroll-container"
        >
          <div className="flex h-[150px] items-center justify-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 w-10 rounded-full border-border bg-background p-0 opacity-20 shadow-lg transition-opacity duration-200 hover:bg-background-secondary group-hover:opacity-100"
                    onClick={() => setSyncScroll((prev) => !prev)}
                    data-testid="sync-scroll-toggle"
                    tabIndex={-1}
                  >
                    {syncScroll ? (
                      <Icons.link2 className="h-5 w-5 text-foreground" />
                    ) : (
                      <Icons.link2Off className="h-5 w-5 text-muted-foreground" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {syncScroll
                    ? t("submit_page.disable_sync_scroll")
                    : t("submit_page.enable_sync_scroll")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between rounded-t-lg border border-b-0 border-border bg-background-secondary/50 px-4 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("submit_page.preview")}
        </span>
        <Link
          target="_blank"
          href="https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax"
          tabIndex={-1}
        >
          <span className="text-xs text-muted-foreground hover:text-destructive transition-colors">
            {t("submit_page.markdown_styling_guide")}
          </span>
        </Link>
      </div>
      <div
        ref={previewContainerRef}
        data-testid="preview-scroller"
        className="flex h-full overflow-y-auto overscroll-contain rounded-b-lg border border-border"
      >
        {previewContent ? (
          <RendererContainer
            body={previewContent}
            author=""
            previewMode
            proxyAuthToken={proxyAuthToken}
            className={postClassName + " w-full min-w-full self-center break-words p-4"}
          />
        ) : (
          <div className="flex w-full flex-col items-center justify-center gap-2 p-8 text-muted-foreground">
            <Icons.eye className="h-8 w-8 opacity-20" />
            <span className="text-sm">{t("submit_page.preview_placeholder")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
