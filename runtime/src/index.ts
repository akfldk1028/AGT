// @agt/runtime — Agent execution engine

export { loadAgtFile, computeChecksum, LoadError } from './loader.js';
export { saveAgtFile } from './saver.js';
export { ConversationManager } from './conversation.js';
export type { ConversationOptions } from './conversation.js';
export { LLMManager } from './llm/index.js';
export type { LLMManagerOptions } from './llm/index.js';
export { OllamaProvider } from './llm/ollama.js';
export { CloudProvider } from './llm/cloud.js';
export { MemoryManager } from './memory/index.js';
export type { MemoryManagerOptions, MemorySearchResult } from './memory/index.js';
export { SqliteVecAdapter } from './memory/sqlite-vec.js';
export { KnowledgeGraphManager } from './memory/knowledge-graph.js';
export { McpManager } from './mcp/index.js';
export { ToolBridge } from './mcp/tool-bridge.js';
export { TraceCollector } from './traces/index.js';
export type { TraceStep, Trace } from './traces/index.js';
export { TraceStore } from './traces/store.js';

import { readFile } from 'node:fs/promises';
import { rm } from 'node:fs/promises';
import { loadAgtFile } from './loader.js';
import { saveAgtFile } from './saver.js';
import { ConversationManager } from './conversation.js';
import type { AgentBundle } from '@agt/core';

export interface AgentRuntimeOptions {
  filePath: string;
  ollamaBaseUrl?: string;
  cloudBaseUrl?: string;
  cloudApiKey?: string;
}

/** High-level API: load an .agt file and start a conversation */
export class AgentRuntime {
  private bundle: AgentBundle | null = null;
  private conversation: ConversationManager | null = null;

  constructor(private options: AgentRuntimeOptions) {}

  /** Load the .agt file and initialize all subsystems */
  async start(): Promise<{
    name: string;
    description: string;
    llmProvider: string;
    llmModel: string;
    memoryCount: number;
    toolCount: number;
  }> {
    this.bundle = await loadAgtFile(this.options.filePath);

    this.conversation = new ConversationManager({
      bundle: this.bundle,
      ollamaBaseUrl: this.options.ollamaBaseUrl,
      cloudBaseUrl: this.options.cloudBaseUrl,
      cloudApiKey: this.options.cloudApiKey,
    });

    const init = await this.conversation.initialize();

    return {
      name: this.bundle.manifest.name,
      description: this.bundle.manifest.description,
      ...init,
    };
  }

  /** Send a message and get a response */
  async chat(message: string): Promise<string> {
    if (!this.conversation) throw new Error('Runtime not started. Call start() first.');
    return this.conversation.send(message);
  }

  /** Clear conversation history */
  clearHistory(): void {
    this.conversation?.clearHistory();
  }

  /** Get the loaded agent bundle */
  getBundle(): AgentBundle | null {
    return this.bundle;
  }

  /**
   * Save the current agent state back to the .agt file.
   * This re-packs the extracted directory (with updated memory.db) into the original .agt.
   * The agent GROWS — every conversation is persisted.
   */
  async save(): Promise<void> {
    if (!this.bundle) return;
    await saveAgtFile(this.bundle);
  }

  /**
   * Stop the runtime: save state → close connections → cleanup temp directory.
   * Call this on graceful shutdown.
   */
  async stop(): Promise<void> {
    if (!this.bundle) return;

    // 1. Close memory DB (flushes WAL) and MCP connections
    await this.conversation?.close();

    // 2. Save updated state back to .agt file
    await saveAgtFile(this.bundle);

    // 3. Clean up temp directory
    try {
      await rm(this.bundle.extractDir, { recursive: true, force: true });
    } catch {
      // Best effort cleanup
    }

    this.conversation = null;
    this.bundle = null;
  }
}
