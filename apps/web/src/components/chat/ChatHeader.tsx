import {
  type DesktopUpdateActionResult,
  type EditorId,
  type ProjectScript,
  type ResolvedKeybindingsConfig,
  type ThreadId,
} from "@t3tools/contracts";
import { memo, useCallback } from "react";
import GitActionsControl from "../GitActionsControl";
import { ArrowDownToLineIcon, DiffIcon, LoaderIcon } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import ProjectScriptsControl, { type NewProjectScriptInput } from "../ProjectScriptsControl";
import { Toggle } from "../ui/toggle";
import { SidebarTrigger } from "../ui/sidebar";
import { OpenInPicker } from "./OpenInPicker";
import { isElectron } from "~/env";
import { useDesktopUpdateState } from "~/hooks/useDesktopUpdateState";
import {
  getDesktopUpdateActionError,
  getDesktopUpdateButtonTooltip,
  isDesktopUpdateButtonDisabled,
  resolveDesktopUpdateButtonAction,
  shouldShowDesktopUpdateButton,
  shouldToastDesktopUpdateActionResult,
} from "../desktopUpdate.logic";
import { toastManager } from "../ui/toast";

interface ChatHeaderProps {
  activeThreadId: ThreadId;
  activeThreadTitle: string;
  activeProjectName: string | undefined;
  isGitRepo: boolean;
  openInCwd: string | null;
  activeProjectScripts: ProjectScript[] | undefined;
  preferredScriptId: string | null;
  keybindings: ResolvedKeybindingsConfig;
  availableEditors: ReadonlyArray<EditorId>;
  diffToggleShortcutLabel: string | null;
  gitCwd: string | null;
  diffOpen: boolean;
  onRunProjectScript: (script: ProjectScript) => void;
  onAddProjectScript: (input: NewProjectScriptInput) => Promise<void>;
  onUpdateProjectScript: (scriptId: string, input: NewProjectScriptInput) => Promise<void>;
  onDeleteProjectScript: (scriptId: string) => Promise<void>;
  onToggleDiff: () => void;
}

export const ChatHeader = memo(function ChatHeader({
  activeThreadId,
  activeThreadTitle,
  activeProjectName,
  isGitRepo,
  openInCwd,
  activeProjectScripts,
  preferredScriptId,
  keybindings,
  availableEditors,
  diffToggleShortcutLabel,
  gitCwd,
  diffOpen,
  onRunProjectScript,
  onAddProjectScript,
  onUpdateProjectScript,
  onDeleteProjectScript,
  onToggleDiff,
}: ChatHeaderProps) {
  const desktopUpdateState = useDesktopUpdateState();
  const desktopUpdateButtonAction = desktopUpdateState
    ? resolveDesktopUpdateButtonAction(desktopUpdateState)
    : "none";
  const desktopUpdateButtonDisabled = isDesktopUpdateButtonDisabled(desktopUpdateState);
  const showDesktopUpdateAction = isElectron && shouldShowDesktopUpdateButton(desktopUpdateState);
  const isActivelyDownloading = desktopUpdateState?.status === "downloading";
  const desktopUpdateTooltip = desktopUpdateState
    ? getDesktopUpdateButtonTooltip(desktopUpdateState)
    : "Update available";
  const desktopUpdateButtonLabel = isActivelyDownloading
    ? typeof desktopUpdateState?.downloadPercent === "number"
      ? `Downloading ${Math.floor(desktopUpdateState.downloadPercent)}%`
      : "Downloading"
    : desktopUpdateButtonAction === "install"
      ? "Update ready"
      : "Update";

  const handleDesktopUpdateActionResultError = useCallback(
    (result: DesktopUpdateActionResult, actionLabel: "download" | "install") => {
      if (!shouldToastDesktopUpdateActionResult(result)) return;
      const actionError = getDesktopUpdateActionError(result);
      if (!actionError) return;
      toastManager.add({
        type: "error",
        title: `Could not ${actionLabel} update`,
        description: actionError,
      });
    },
    [],
  );

  const handleDesktopUpdateActionClick = useCallback(() => {
    const bridge = window.desktopBridge;
    if (!bridge || !desktopUpdateState) return;
    if (desktopUpdateButtonDisabled || desktopUpdateButtonAction === "none") return;

    if (desktopUpdateButtonAction === "download") {
      void bridge
        .downloadUpdate()
        .then((result) => {
          if (result.completed) {
            toastManager.add({
              type: "success",
              title: "Update downloaded",
              description: "Restart the app from the update button to install it.",
            });
          }
          handleDesktopUpdateActionResultError(result, "download");
        })
        .catch((error) => {
          toastManager.add({
            type: "error",
            title: "Could not start update download",
            description: error instanceof Error ? error.message : "An unexpected error occurred.",
          });
        });
      return;
    }

    if (desktopUpdateButtonAction === "install") {
      void bridge
        .installUpdate()
        .then((result) => {
          handleDesktopUpdateActionResultError(result, "install");
        })
        .catch((error) => {
          toastManager.add({
            type: "error",
            title: "Could not install update",
            description: error instanceof Error ? error.message : "An unexpected error occurred.",
          });
        });
    }
  }, [
    desktopUpdateButtonAction,
    desktopUpdateButtonDisabled,
    desktopUpdateState,
    handleDesktopUpdateActionResultError,
  ]);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden sm:gap-3">
        <SidebarTrigger className="size-7 shrink-0 md:hidden" />
        <h2
          className="min-w-0 shrink truncate text-sm font-medium text-foreground"
          title={activeThreadTitle}
        >
          {activeThreadTitle}
        </h2>
        {activeProjectName && (
          <Badge variant="outline" className="min-w-0 shrink truncate">
            {activeProjectName}
          </Badge>
        )}
        {activeProjectName && !isGitRepo && (
          <Badge variant="outline" className="shrink-0 text-[10px] text-amber-700">
            No Git
          </Badge>
        )}
      </div>
      <div className="@container/header-actions ml-auto flex min-w-0 shrink-0 items-center justify-end gap-2 @sm/header-actions:gap-3">
        {showDesktopUpdateAction && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="xs"
                  variant="outline"
                  className="shrink-0"
                  onClick={handleDesktopUpdateActionClick}
                  disabled={desktopUpdateButtonDisabled}
                  aria-label={desktopUpdateTooltip}
                  aria-busy={isActivelyDownloading || undefined}
                >
                  {isActivelyDownloading ? (
                    <LoaderIcon className="size-3.5 animate-spin text-foreground" />
                  ) : (
                    <ArrowDownToLineIcon className="size-3.5 text-success" />
                  )}
                  <span className="sr-only">{desktopUpdateButtonLabel}</span>
                </Button>
              }
            />
            <TooltipPopup side="bottom">
              {desktopUpdateButtonAction === "install" ? (
                <span className="font-medium text-success">Update is Ready!</span>
              ) : (
                desktopUpdateTooltip
              )}
            </TooltipPopup>
          </Tooltip>
        )}
        {activeProjectScripts && (
          <ProjectScriptsControl
            scripts={activeProjectScripts}
            keybindings={keybindings}
            preferredScriptId={preferredScriptId}
            onRunScript={onRunProjectScript}
            onAddScript={onAddProjectScript}
            onUpdateScript={onUpdateProjectScript}
            onDeleteScript={onDeleteProjectScript}
          />
        )}
        {activeProjectName && (
          <OpenInPicker
            keybindings={keybindings}
            availableEditors={availableEditors}
            openInCwd={openInCwd}
          />
        )}
        {activeProjectName && <GitActionsControl gitCwd={gitCwd} activeThreadId={activeThreadId} />}
        <Tooltip>
          <TooltipTrigger
            render={
              <Toggle
                className="shrink-0"
                pressed={diffOpen}
                onPressedChange={onToggleDiff}
                aria-label="Toggle diff panel"
                variant="outline"
                size="xs"
                disabled={!isGitRepo}
              >
                <DiffIcon className="size-3" />
              </Toggle>
            }
          />
          <TooltipPopup side="bottom">
            {!isGitRepo
              ? "Diff panel is unavailable because this project is not a git repository."
              : diffToggleShortcutLabel
                ? `Toggle diff panel (${diffToggleShortcutLabel})`
                : "Toggle diff panel"}
          </TooltipPopup>
        </Tooltip>
      </div>
    </div>
  );
});
