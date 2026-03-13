export const APP_BASE_NAME = "T3 Code";
export const APP_STAGE_LABEL = import.meta.env.DEV ? "Dev" : "Alpha";
export const APP_DISPLAY_NAME = `${APP_BASE_NAME} (${APP_STAGE_LABEL})`;
const APP_VERSION_FROM_BUILD =
  typeof import.meta.env.APP_VERSION === "string" ? import.meta.env.APP_VERSION.trim() : "";
export const APP_VERSION = APP_VERSION_FROM_BUILD.length > 0 ? APP_VERSION_FROM_BUILD : "unknown";
