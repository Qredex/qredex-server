/**
 *    ▄▄▄▄
 *  ▄█▀▀███▄▄              █▄
 *  ██    ██ ▄             ██
 *  ██    ██ ████▄▄█▀█▄ ▄████ ▄█▀█▄▀██ ██▀
 *  ██  ▄ ██ ██   ██▄█▀ ██ ██ ██▄█▀  ███
 *   ▀█████▄▄█▀  ▄▀█▄▄▄▄█▀███▄▀█▄▄▄▄██ ██▄
 *        ▀█
 *
 *  Copyright (C) 2026 — 2026, Qredex, LTD. All Rights Reserved.
 *
 *  DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 *  Licensed under the Apache License, Version 2.0. See LICENSE for the full license text.
 *  You may not use this file except in compliance with that License.
 *  Unless required by applicable law or agreed to in writing, software distributed under the
 *  License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 *  either express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 *
 *  If you need additional information or have any questions, please email: copyright@qredex.com
 */

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
