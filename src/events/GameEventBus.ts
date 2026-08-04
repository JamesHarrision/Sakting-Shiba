import type { GameEventName, GameEventPayloads } from "./gameEvents";

type EventHandler<TEvent extends GameEventName> = (
  payload: GameEventPayloads[TEvent]
) => void;

type AnyEventHandler = (payload: GameEventPayloads[GameEventName]) => void;

export class GameEventBus {
  private readonly handlers = new Map<GameEventName, Set<AnyEventHandler>>();

  on<TEvent extends GameEventName>(
    eventName: TEvent,
    handler: EventHandler<TEvent>
  ): () => void {
    const handlers = this.getHandlers(eventName);
    handlers.add(handler as AnyEventHandler);

    return () => {
      handlers.delete(handler as AnyEventHandler);
    };
  }

  emit<TEvent extends GameEventName>(
    eventName: TEvent,
    payload: GameEventPayloads[TEvent]
  ): void {
    const handlers = this.handlers.get(eventName);

    if (!handlers) {
      return;
    }

    for (const handler of handlers) {
      handler(payload as GameEventPayloads[GameEventName]);
    }
  }

  clear(): void {
    for (const handlers of this.handlers.values()) {
      handlers.clear();
    }
  }

  private getHandlers<TEvent extends GameEventName>(
    eventName: TEvent
  ): Set<AnyEventHandler> {
    const existingHandlers = this.handlers.get(eventName);

    if (existingHandlers) {
      return existingHandlers;
    }

    const handlers = new Set<AnyEventHandler>();
    this.handlers.set(eventName, handlers);
    return handlers;
  }
}
