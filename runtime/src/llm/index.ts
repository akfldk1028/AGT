import type { LLMProvider, ChatMessage, ChatResponse, LLMOptions, ModelSpec } from '@agt/core';
import { OLLAMA_BASE_URL } from '@agt/core';
import { OllamaProvider } from './ollama.js';
import { CloudProvider } from './cloud.js';

export interface LLMManagerOptions {
  modelSpec: ModelSpec;
  ollamaBaseUrl?: string;
  cloudBaseUrl?: string;
  cloudApiKey?: string;
}

/** LLM manager — selects and manages the appropriate LLM provider */
export class LLMManager implements LLMProvider {
  private provider: LLMProvider | null = null;
  private modelSpec: ModelSpec;
  private ollamaBaseUrl: string;
  private cloudBaseUrl?: string;
  private cloudApiKey?: string;

  constructor(options: LLMManagerOptions) {
    this.modelSpec = options.modelSpec;
    this.ollamaBaseUrl = options.ollamaBaseUrl ?? OLLAMA_BASE_URL;
    this.cloudBaseUrl = options.cloudBaseUrl;
    this.cloudApiKey = options.cloudApiKey;
  }

  /** Initialize the provider — check Ollama first, then fallback to cloud */
  async initialize(): Promise<{ provider: string; model: string }> {
    // Try Ollama first
    const ollama = new OllamaProvider(this.ollamaBaseUrl);
    const isAvailable = await ollama.isAvailable();

    if (isAvailable) {
      const model = await this.findOllamaModel(ollama);
      if (model) {
        ollama.setModel(model);
        ollama.setEmbeddingModel(this.modelSpec.embedding.model);
        this.provider = ollama;
        return { provider: 'ollama', model };
      }
    }

    // Fallback to cloud if configured
    if (this.cloudBaseUrl && this.cloudApiKey) {
      const cloud = new CloudProvider(this.cloudBaseUrl, this.cloudApiKey);
      cloud.setModel(this.modelSpec.inference.preferred);
      cloud.setEmbeddingModel(this.modelSpec.embedding.model);
      this.provider = cloud;
      return { provider: 'cloud', model: this.modelSpec.inference.preferred };
    }

    throw new Error(
      `No LLM provider available. Install Ollama and run: ollama pull ${this.modelSpec.inference.preferred}`
    );
  }

  private async findOllamaModel(ollama: OllamaProvider): Promise<string | null> {
    const models = await ollama.listModels();
    const modelNames = models.map(m => m.name);

    // Check preferred model
    if (modelNames.some(n => n.startsWith(this.modelSpec.inference.preferred))) {
      return this.modelSpec.inference.preferred;
    }

    // Check fallback models
    for (const fallback of this.modelSpec.inference.fallback ?? []) {
      if (modelNames.some(n => n.startsWith(fallback))) {
        return fallback;
      }
    }

    return null;
  }

  async chat(messages: ChatMessage[], options?: LLMOptions): Promise<ChatResponse> {
    if (!this.provider) throw new Error('LLM not initialized. Call initialize() first.');
    return this.provider.chat(messages, {
      temperature: this.modelSpec.temperature,
      top_p: this.modelSpec.top_p,
      ...options,
    });
  }

  async embed(text: string): Promise<number[]> {
    if (!this.provider) throw new Error('LLM not initialized. Call initialize() first.');
    return this.provider.embed(text);
  }
}
