import type {
  QredexDebugEvent,
  QredexDebugHook,
  QredexLogger,
} from "../types";

export async function emitDebugEvent(
  hook: QredexDebugHook | undefined,
  logger: QredexLogger | undefined,
  event: QredexDebugEvent,
): Promise<void> {
  if (!hook) {
    return;
  }

  try {
    await hook(event);
  } catch (error) {
    logger?.warn?.("qredex.debug_hook_error", {
      eventType: event.type,
      message: error instanceof Error ? error.message : "Unknown debug hook error",
    });
  }
}
