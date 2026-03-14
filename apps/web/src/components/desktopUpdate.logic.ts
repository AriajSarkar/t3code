import type { DesktopUpdateActionResult, DesktopUpdateState } from "@t3tools/contracts";

export type DesktopUpdateButtonAction = "download" | "install" | "none";
export type DesktopUpdateToastType = "error" | "info" | "success" | "warning";

export interface DesktopUpdateToast {
  type: DesktopUpdateToastType;
  title: string;
  description?: string;
}

export function resolveDesktopUpdateButtonAction(
  state: DesktopUpdateState,
): DesktopUpdateButtonAction {
  if (state.status === "available") {
    return "download";
  }
  if (state.status === "downloaded") {
    return "install";
  }
  if (state.status === "error") {
    if (state.errorContext === "install" && state.downloadedVersion) {
      return "install";
    }
    if (state.errorContext === "download" && state.availableVersion) {
      return "download";
    }
  }
  return "none";
}

export function shouldShowDesktopUpdateButton(state: DesktopUpdateState | null): boolean {
  if (!state || !state.enabled) {
    return false;
  }
  if (state.status === "downloading") {
    return true;
  }
  return resolveDesktopUpdateButtonAction(state) !== "none";
}

export function shouldShowArm64IntelBuildWarning(state: DesktopUpdateState | null): boolean {
  return state?.hostArch === "arm64" && state.appArch === "x64";
}

export function isDesktopUpdateButtonDisabled(state: DesktopUpdateState | null): boolean {
  return state?.status === "downloading";
}

export function getArm64IntelBuildWarningDescription(state: DesktopUpdateState): string {
  if (!shouldShowArm64IntelBuildWarning(state)) {
    return "This install is using the correct architecture.";
  }

  const action = resolveDesktopUpdateButtonAction(state);
  if (action === "download") {
    return "This Mac has Apple Silicon, but T3 Code is still running the Intel build under Rosetta. Download the available update to switch to the native Apple Silicon build.";
  }
  if (action === "install") {
    return "This Mac has Apple Silicon, but T3 Code is still running the Intel build under Rosetta. Restart to install the downloaded Apple Silicon build.";
  }
  return "This Mac has Apple Silicon, but T3 Code is still running the Intel build under Rosetta. The next app update will replace it with the native Apple Silicon build.";
}

export function getDesktopUpdateButtonTooltip(state: DesktopUpdateState): string {
  if (state.status === "available") {
    return `Update ${state.availableVersion ?? "available"} ready to download`;
  }
  if (state.status === "downloading") {
    const progress =
      typeof state.downloadPercent === "number" ? ` (${Math.floor(state.downloadPercent)}%)` : "";
    return `Downloading update${progress}`;
  }
  if (state.status === "downloaded") {
    return `Update ${state.downloadedVersion ?? state.availableVersion ?? "ready"} downloaded. Click to restart and install.`;
  }
  if (state.status === "error") {
    if (state.errorContext === "download" && state.availableVersion) {
      return `Download failed for ${state.availableVersion}. Click to retry.`;
    }
    if (state.errorContext === "install" && state.downloadedVersion) {
      return `Install failed for ${state.downloadedVersion}. Click to retry.`;
    }
    return state.message ?? "Update failed";
  }
  return "Update available";
}

export function getDesktopUpdateActionError(result: DesktopUpdateActionResult): string | null {
  if (!result.accepted || result.completed) return null;
  if (typeof result.state.message !== "string") return null;
  const message = result.state.message.trim();
  return message.length > 0 ? message : null;
}

export function getDesktopUpdateCheckToast(result: DesktopUpdateActionResult): DesktopUpdateToast {
  const { state } = result;

  if (!result.accepted) {
    if (!state.enabled) {
      return {
        type: "warning",
        title: "Updates unavailable",
        description: "Automatic updates are disabled or unavailable in this environment.",
      };
    }
    if (state.status === "checking") {
      return {
        type: "info",
        title: "Already checking",
        description: "An update check is already in progress.",
      };
    }
    if (state.status === "downloading") {
      return {
        type: "info",
        title: "Update download in progress",
        description: "A newer version is already downloading in the background.",
      };
    }
    if (state.status === "downloaded") {
      return {
        type: "success",
        title: "Update ready",
        description: "Restart the app from the update button to install it.",
      };
    }
    return {
      type: "info",
      title: "Could not start update check",
      description: "Please try again in a moment.",
    };
  }

  if (!result.completed || state.status === "error") {
    return {
      type: "error",
      title: "Update check failed",
      description: state.message ?? "An unknown error occurred while checking for updates.",
    };
  }

  if (state.status === "up-to-date") {
    return {
      type: "success",
      title: "You're up to date",
      description: `T3 Code ${state.currentVersion} is the newest available version.`,
    };
  }

  if (state.status === "downloaded") {
    return {
      type: "success",
      title: "Update ready",
      description: "Restart the app from the update button to install it.",
    };
  }

  if (state.status === "available" || state.status === "downloading") {
    return {
      type: "success",
      title: "Update available",
      description: "Downloading the update in the background.",
    };
  }

  if (state.status === "checking") {
    return {
      type: "info",
      title: "Update check started",
      description: "Looking for a newer desktop version now.",
    };
  }

  return {
    type: "info",
    title: "Update check completed",
  };
}

export function shouldToastDesktopUpdateActionResult(result: DesktopUpdateActionResult): boolean {
  return result.accepted && !result.completed;
}

export function shouldHighlightDesktopUpdateError(state: DesktopUpdateState | null): boolean {
  if (!state || state.status !== "error") return false;
  return state.errorContext === "download" || state.errorContext === "install";
}
