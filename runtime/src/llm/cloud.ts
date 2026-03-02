import type { LLMProvider, ChatMessage, ChatResponse, LLMOptions } from '@agt/core';

/** Cloud LLM provider — OpenAI-compatible API fallback */
export class CloudProvider implements LLMProvider {
  private model = '';
  private embeddingModel = '';

  constructor(
    private baseUrl: string,
    private apiKey: string,
  ) {}

  setModel(model: string): void {
    this.model = model;
  }

  setEmbeddingModel(model: string): void {
    this.embeddingModel = model;
  }

  /** Chat completion via OpenAI-compatible API */
  async chat(messages: ChatMessage[], options?: LLMOptions): Promise<ChatResponse> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options?.temperature ?? 0.7,
      top_p: options?.top_p,
      max_tokens: options?.max_tokens,
    };

    if (options?.tools && options.tools.length > 0) {
      body.tools = options.tools;
    }

    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Cloud LLM chat failed (${res.status}): ${error}`);
    }

    const data = await res.json() as {
      choices: Array<{
        message: {
          content: string;
          tool_calls?: Array<{
            id: string;
            type: string;
            function: { name: string; arguments: string };
          }>;
        };
      }>;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    const choice = data.choices[0];
    return {
      content: choice.message.content ?? '',
      tool_calls: choice.message.tool_calls?.map(tc => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      })),
      usage: data.usage,
    };
  }

  /** Generate embeddings via OpenAI-compatible API */
  async embed(text: string): Promise<number[]> {
    const res = await fetch(`${this.baseUrl}/v1/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.embeddingModel,
        input: text,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Cloud LLM embed failed (${res.status}): ${error}`);
    }

    const data = await res.json() as {
      data: Array<{ embedding: number[] }>;
    };

    return data.data[0].embedding;
  }
}
