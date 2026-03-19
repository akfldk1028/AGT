// ============================================================
// AGT EventBus — Loosely-coupled module communication
// OpenJarvis EventBus pattern: pub/sub for cross-module events
// ============================================================

/** All event types emitted across the AGT runtime */
export type AgtEventType =
  | 'AGENT_LOAD'
  | 'AGENT_SAVE'
  | 'LLM_CALL_START'
  | 'LLM_CALL_END'
  | 'LLM_CALL_ERROR'
  | 'MEMORY_QUERY'
  | 'MEMORY_STORE'
  | 'TOOL_EXEC_START'
  | 'TOOL_EXEC_END'
  | 'CONVERSATION_TURN'
  | 'TRACE_STEP';

/** Event payload — every event carries a type-tagged data object */
export interface AgtEvent<T = Record<string, unknown>> {
  type: AgtEventType;
  timestamp: number;
  data: T;
}

type EventHandler<T = Record<string, unknown>> = (event: AgtEvent<T>) => void;

/** Synchronous event bus for module-to-module communication */
export class EventBus {
  private handlers = new Map<AgtEventType, Set<EventHandler>>();

  /** Subscribe to an event type */
  on(type: AgtEventType, handler: EventHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
  }

  /** Unsubscribe from an event type */
  off(type: AgtEventType, handler: EventHandler): void {
    this.handlers.get(type)?.delete(handler);
  }

  /** Emit an event to all subscribers (handler errors are isolated) */
  emit(type: AgtEventType, data: Record<string, unknown> = {}): void {
    const event: AgtEvent = { type, timestamp: Date.now(), data };
    const handlers = this.handlers.get(type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch {
          // Swallow — one failing handler must not block others
        }
      }
    }
  }

  /** Remove all handlers (useful for testing) */
  clear(): void {
    this.handlers.clear();
  }
}

/** Global singleton event bus */
export const bus = new EventBus();
