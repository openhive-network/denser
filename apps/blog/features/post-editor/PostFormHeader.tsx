"use client";

import { Dispatch, SetStateAction } from "react";
import { Button } from "@hive/ui/components/button";
import { useTranslation } from "@/blog/i18n/client";

interface PostFormHeaderProps {
  sideBySide: boolean;
  setSideBySide: Dispatch<SetStateAction<boolean>>;
  preview: boolean;
  setPreview: Dispatch<SetStateAction<boolean>>;
}

export function PostFormHeader({ sideBySide, setSideBySide, preview, setPreview }: PostFormHeaderProps) {
  const { t } = useTranslation("common_blog");

  return (
    <div className="flex items-center justify-between rounded-md bg-background-secondary px-3 py-2">
      <Button
        type="button"
        variant="ghost"
        className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setSideBySide((prev) => !prev)}
        data-testid="enable-disable-side-by-side-editor"
        tabIndex={-1}
      >
        {sideBySide ? t("submit_page.disable_side") : t("submit_page.enable_side")}
      </Button>
      <Button
        type="button"
        onClick={() => setPreview((prev) => !prev)}
        variant="ghost"
        className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        data-testid="hide-show-preview"
        tabIndex={-1}
      >
        {preview ? t("submit_page.hide_preview") : t("submit_page.show_preview")}
      </Button>
    </div>
  );
}
