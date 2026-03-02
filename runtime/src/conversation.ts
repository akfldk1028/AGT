import type { AgentBundle, ChatMessage, LLMOptions, ToolDefinition } from '@agt/core';
import { LLMManager } from './llm/index.js';
import { MemoryManager } from './memory/index.js';
import { McpManager } from './mcp/index.js';

export interface ConversationOptions {
  bundle: AgentBundle;
  ollamaBaseUrl?: string;
  cloudBaseUrl?: string;
  cloudApiKey?: string;
  onMessage?: (message: ChatMessage) => void;
}

/** Conversation manager — orchestrates persona, memory, tools, and LLM */
export class ConversationManager {
  private llm: LLMManager;
  private memory: MemoryManager | null = null;
  private mcp: McpManager | null = null;
  private history: ChatMessage[] = [];
  private tools: ToolDefinition[] = [];
  private bundle: AgentBundle;
  private onMessage?: (message: ChatMessage) => void;

  constructor(options: ConversationOptions) {
    this.bundle = options.bundle;
    this.onMessage = options.onMessage;

    this.llm = new LLMManager({
      modelSpec: options.bundle.modelSpec,
      ollamaBaseUrl: options.ollamaBaseUrl,
      cloudBaseUrl: options.cloudBaseUrl,
      cloudApiKey: options.cloudApiKey,
    });
  }

  /** Initialize all subsystems */
  async initialize(): Promise<{
    llmProvider: string;
    llmModel: string;
    memoryCount: number;
    toolCount: number;
  }> {
    // 1. Initialize LLM
    const { provider: llmProvider, model: llmModel } = await this.llm.initialize();

    // 2. Initialize memory
    if (this.bundle.memoryDbPath) {
      this.memory = new MemoryManager({
        dbPath: this.bundle.memoryDbPath,
        knowledge: this.bundle.knowledge,
        embeddingProvider: this.llm,
        embeddingDimensions: this.bundle.modelSpec.embedding.dimensions,
      });
    }

    // 3. Initialize MCP tools
    if (this.bundle.mcpConfig) {
      this.mcp = new McpManager({ config: this.bundle.mcpConfig });
      const { connected } = await this.mcp.connect();
      if (connected.length > 0) {
        this.tools = await this.mcp.listTools();
      }
    }

    return {
      llmProvider,
      llmModel,
      memoryCount: this.memory?.count ?? 0,
      toolCount: this.tools.length,
    };
  }

  /** Send a user message and get the agent's response */
  async send(userMessage: string): Promise<string> {
    // 1. Build context from memory
    const memoryContext = await this.buildMemoryContext(userMessage);

    // 2. Build system prompt
    const systemPrompt = this.buildSystemPrompt(memoryContext);

    // 3. Add user message to history
    const userMsg: ChatMessage = { role: 'user', content: userMessage };
    this.history.push(userMsg);
    this.onMessage?.(userMsg);

    // 4. Build messages for LLM
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...this.history,
    ];

    // 5. Call LLM with tools
    const options: LLMOptions = {};
    if (this.tools.length > 0) {
      options.tools = this.tools;
    }

    let response = await this.llm.chat(messages, options);

    // 6. Handle tool calls (max 10 iterations to prevent infinite loops)
    let toolIterations = 0;
    const MAX_TOOL_ITERATIONS = 10;
    while (response.tool_calls && response.tool_calls.length > 0 && this.mcp && toolIterations < MAX_TOOL_ITERATIONS) {
      toolIterations++;
      // Add assistant message with tool calls
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: response.content,
        tool_calls: response.tool_calls,
      };
      this.history.push(assistantMsg);

      // Execute each tool call
      for (const toolCall of response.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await this.mcp.executeTool(toolCall.function.name, args);

        const toolMsg: ChatMessage = {
          role: 'tool',
          content: JSON.stringify(result),
          tool_call_id: toolCall.id,
        };
        this.history.push(toolMsg);
      }

      // Get next LLM response
      const updatedMessages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...this.history,
      ];
      response = await this.llm.chat(updatedMessages, options);
    }

    // 7. Add final response to history
    const assistantMsg: ChatMessage = { role: 'assistant', content: response.content };
    this.history.push(assistantMsg);
    this.onMessage?.(assistantMsg);

    // 8. Save to memory (background, non-blocking)
    this.saveToMemory(userMessage, response.content).catch(() => {});

    return response.content;
  }

  private async buildMemoryContext(query: string): Promise<string> {
    if (!this.memory) return '';

    const results = await this.memory.search(query);
    if (results.length === 0) return '';

    const lines = results.map(r =>
      `[Memory ${r.score.toFixed(2)}] ${r.entry.content}`
    );
    return lines.join('\n');
  }

  private buildSystemPrompt(memoryContext: string): string {
    const { persona } = this.bundle;
    let prompt = persona.system_prompt;

    // Add domain context
    if (this.bundle.domain) {
      prompt += `\n\nDomain: ${this.bundle.domain.name}`;
      if (this.bundle.domain.topics) {
        prompt += ` (${this.bundle.domain.topics.join(', ')})`;
      }
    }

    // Add relevant memories
    if (memoryContext) {
      prompt += `\n\n## Relevant Memories\n${memoryContext}`;
    }

    // Add constraints
    if (persona.constraints && persona.constraints.length > 0) {
      prompt += `\n\n## Constraints\n${persona.constraints.map(c => `- ${c}`).join('\n')}`;
    }

    return prompt;
  }

  private async saveToMemory(userMessage: string, response: string): Promise<void> {
    if (!this.memory) return;
    const summary = `User asked: ${userMessage.slice(0, 100)}. Agent responded about: ${response.slice(0, 200)}`;
    await this.memory.add(summary, 'conversation');
  }

  /** Get conversation history */
  getHistory(): ChatMessage[] {
    return [...this.history];
  }

  /** Clear conversation history (keeps memory) */
  clearHistory(): void {
    this.history = [];
  }

  /** Cleanup — close connections and save state */
  async close(): Promise<void> {
    this.memory?.close();
    await this.mcp?.disconnect();
  }
}
