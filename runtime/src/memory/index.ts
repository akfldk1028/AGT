import type { MemoryEntry, LLMProvider } from '@agt/core';
import { SqliteVecAdapter } from './sqlite-vec.js';
import type { KnowledgeGraph } from '@agt/core';

export interface MemorySearchResult {
  entry: MemoryEntry;
  score: number;
}

export interface MemoryManagerOptions {
  dbPath?: string;
  knowledge?: KnowledgeGraph;
  embeddingProvider: LLMProvider;
  embeddingDimensions?: number;
  topK?: number;
}

/** Unified memory manager — handles vector search and knowledge graph queries */
export class MemoryManager {
  private vectorDb: SqliteVecAdapter | null = null;
  private knowledge: KnowledgeGraph | null;
  private embeddingProvider: LLMProvider;
  private topK: number;

  constructor(options: MemoryManagerOptions) {
    this.knowledge = options.knowledge ?? null;
    this.embeddingProvider = options.embeddingProvider;
    this.topK = options.topK ?? 5;

    if (options.dbPath) {
      this.vectorDb = new SqliteVecAdapter(options.dbPath, options.embeddingDimensions);
    }
  }

  /** Search memory for relevant context given a query */
  async search(query: string): Promise<MemorySearchResult[]> {
    if (!this.vectorDb) return [];

    const embedding = await this.embeddingProvider.embed(query);
    return this.vectorDb.search(new Float32Array(embedding), this.topK);
  }

  /** Add a new memory entry */
  async add(content: string, source: 'conversation' | 'training' | 'imported', topic?: string): Promise<void> {
    if (!this.vectorDb) return;

    const embedding = await this.embeddingProvider.embed(content);
    this.vectorDb.insert({
      content,
      embedding: new Float32Array(embedding),
      importance: 0.5,
      source,
      topic,
      created_at: new Date().toISOString(),
    });
  }

  /** Query knowledge graph for related nodes */
  queryKnowledge(nodeId: string): { nodes: KnowledgeGraph['nodes']; edges: KnowledgeGraph['edges'] } {
    if (!this.knowledge) return { nodes: [], edges: [] };

    const relatedEdges = this.knowledge.edges.filter(
      e => e.source === nodeId || e.target === nodeId
    );
    const relatedNodeIds = new Set<string>([nodeId]);
    for (const edge of relatedEdges) {
      relatedNodeIds.add(edge.source);
      relatedNodeIds.add(edge.target);
    }
    const relatedNodes = this.knowledge.nodes.filter(n => relatedNodeIds.has(n.id));

    return { nodes: relatedNodes, edges: relatedEdges };
  }

  /** Get total memory count */
  get count(): number {
    return this.vectorDb?.count() ?? 0;
  }

  /** Close database connection */
  close(): void {
    this.vectorDb?.close();
  }
}
