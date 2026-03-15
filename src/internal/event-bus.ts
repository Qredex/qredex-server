import type { QredexEventHandler, QredexEventSubscriber } from "../events";
import type { QredexLogger, QredexEvent, QredexEventHook, QredexEventType } from "../types";

export class QredexEventBus implements QredexEventSubscriber {
  private readonly allHandlers = new Set<QredexEventHandler>();
  private readonly handlersByType = new Map<QredexEventType, Set<QredexEventHandler>>();
  private readonly hooks: QredexEventHook[];

  constructor(
    private readonly logger?: QredexLogger,
    hooks: QredexEventHook[] = [],
  ) {
    this.hooks = hooks;
  }

  subscribe(handler: QredexEventHandler): () => void {
    this.allHandlers.add(handler);

    return () => {
      this.allHandlers.delete(handler);
    };
  }

  on<TType extends QredexEventType>(
    type: TType,
    handler: QredexEventHandler<Extract<QredexEvent, { type: TType }>>,
  ): () => void {
    const handlers = this.handlersByType.get(type) ?? new Set<QredexEventHandler>();
    handlers.add(handler as QredexEventHandler);
    this.handlersByType.set(type, handlers);

    return () => {
      handlers.delete(handler as QredexEventHandler);
      if (handlers.size === 0) {
        this.handlersByType.delete(type);
      }
    };
  }

  async emit(event: QredexEvent): Promise<void> {
    for (const hook of this.hooks) {
      await this.invoke(hook, event);
    }

    for (const handler of this.allHandlers) {
      await this.invoke(handler, event);
    }

    for (const handler of this.handlersByType.get(event.type) ?? []) {
      await this.invoke(handler, event);
    }
  }

  private async invoke(
    handler: QredexEventHook | QredexEventHandler,
    event: QredexEvent,
  ): Promise<void> {
    try {
      await handler(event);
    } catch (error) {
      this.logger?.warn?.("qredex.event_handler_error", {
        eventType: event.type,
        message: error instanceof Error ? error.message : "Unknown event handler error",
      });
    }
  }
}
