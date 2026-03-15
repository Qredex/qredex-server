import type { MaybePromise, QredexEvent, QredexEventType } from "./types";

export type QredexEventHandler<TEvent extends QredexEvent = QredexEvent> = (
  event: TEvent,
) => MaybePromise<void>;

export interface QredexEventSubscriber {
  on<TType extends QredexEventType>(
    type: TType,
    handler: QredexEventHandler<Extract<QredexEvent, { type: TType }>>,
  ): () => void;
  subscribe(handler: QredexEventHandler): () => void;
}
