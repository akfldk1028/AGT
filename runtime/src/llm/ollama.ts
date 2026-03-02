import type { LLMProvider, ChatMessage, ChatResponse, LLMOptions } from '@agt/core';

interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

/** Ollama LLM provider — local execution via HTTP API */
export class OllamaProvider implements LLMProvider {
  private model = '';
  private embeddingModel = '';

  constructor(private baseUrl: string) {}

  setModel(model: string): void {
    this.model = model;
  }

  setEmbeddingModel(model: string): void {
    this.embeddingModel = model;
  }

  /** Check if Ollama is running */
  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`);
      return res.ok;
    } catch {
      return false;
    }
  }

  /** List installed models */
  async listModels(): Promise<OllamaModel[]> {
    const res = await fetch(`${this.baseUrl}/api/tags`);
    if (!res.ok) return [];
    const data = await res.json() as { models: OllamaModel[] };
    return data.models ?? [];
  }

  /** Chat completion */
  async chat(messages: ChatMessage[], options?: LLMOptions): Promise<ChatResponse> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      stream: false,
      options: {
        temperature: options?.temperature ?? 0.7,
        top_p: options?.top_p,
        num_predict: options?.max_tokens,
      },
    };

    // Add tools if provided
    if (options?.tools && options.tools.length > 0) {
      body.tools = options.tools;
    }

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Ollama chat failed: ${error}`);
    }

    const data = await res.json() as {
      message: { role: string; content: string; tool_calls?: Array<{ function: { name: string; arguments: Record<string, unknown> } }> };
      eval_count?: number;
      prompt_eval_count?: number;
    };

    const toolCalls = data.message.tool_calls?.map((tc, i) => ({
      id: `call_${i}`,
      type: 'function' as const,
      function: {
        name: tc.function.name,
        arguments: JSON.stringify(tc.function.arguments),
      },
    }));

    return {
      content: data.message.content,
      tool_calls: toolCalls,
      usage: {
        prompt_tokens: data.prompt_eval_count ?? 0,
        completion_tokens: data.eval_count ?? 0,
      },
    };
  }

  /** Generate embeddings */
  async embed(text: string): Promise<number[]> {
    const res = await fetch(`${this.baseUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.embeddingModel,
        input: text,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Ollama embed failed: ${error}`);
    }

    const data = await res.json() as { embeddings: number[][] };
    return data.embeddings[0];
  }
}
