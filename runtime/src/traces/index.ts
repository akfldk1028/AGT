// ============================================================
// AGT Trace Collector — Interaction tracking
// Records conversation/tool/memory events for future learning
// ============================================================

import { bus, type AgtEventType, type AgtEvent } from '@agt/core';
import { TraceStore } from './store.js';

/** A single step in a trace session */
export interface TraceStep {
  type: AgtEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

/** A complete trace session */
export interface Trace {
  agentId: string;
  sessionId: string;
  startedAt: number;
  steps: TraceStep[];
}

/** Events to automatically capture */
const TRACKED_EVENTS: AgtEventType[] = [
  'AGENT_LOAD',
  'LLM_CALL_START',
  'LLM_CALL_END',
  'LLM_CALL_ERROR',
  'MEMORY_QUERY',
  'MEMORY_STORE',
  'TOOL_EXEC_START',
  'TOOL_EXEC_END',
  'CONVERSATION_TURN',
];

/**
 * Collects trace events from the EventBus and stores them.
 * One TraceCollector per agent session.
 */
export class TraceCollector {
  private steps: TraceStep[] = [];
  private handler: (event: AgtEvent) => void;

  constructor(
    private readonly agentId: string,
    private readonly sessionId: string,
  ) {
    // Single handler that captures all tracked events
    this.handler = (event: AgtEvent) => {
      this.steps.push({
        type: event.type,
        timestamp: event.timestamp,
        data: event.data,
      });
    };
  }

  /** Start listening to events */
  start(): void {
    for (const eventType of TRACKED_EVENTS) {
      bus.on(eventType, this.handler);
    }
  }

  /** Stop listening and optionally persist */
  async stop(persistPath?: string): Promise<Trace> {
    for (const eventType of TRACKED_EVENTS) {
      bus.off(eventType, this.handler);
    }

    const trace: Trace = {
      agentId: this.agentId,
      sessionId: this.sessionId,
      startedAt: this.steps[0]?.timestamp ?? Date.now(),
      steps: this.steps,
    };

    // Persist to SQLite if path provided
    if (persistPath) {
      const store = new TraceStore(persistPath);
      await store.save(trace);
      await store.close();
    }

    return trace;
  }

  /** Get current steps (for live inspection) */
  getSteps(): readonly TraceStep[] {
    return this.steps;
  }
}
