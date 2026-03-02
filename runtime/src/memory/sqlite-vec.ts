import Database from 'better-sqlite3';
import type { MemoryEntry } from '@agt/core';
import type { MemorySearchResult } from './index.js';

/** sqlite-vec adapter for vector similarity search */
export class SqliteVecAdapter {
  private db: Database.Database;
  private dimensions: number;

  constructor(dbPath: string, dimensions = 768) {
    this.dimensions = dimensions;
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.ensureSchema();
  }

  private ensureSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        embedding BLOB NOT NULL,
        importance REAL DEFAULT 0.5,
        source TEXT DEFAULT 'conversation',
        topic TEXT,
        metadata TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        accessed_at TEXT
      );
    `);

    // Note: sqlite-vec extension must be loaded externally
    // The virtual table creation is attempted but may fail without the extension
    try {
      this.db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS memory_vec USING vec0(
          id INTEGER PRIMARY KEY,
          embedding float[${this.dimensions}]
        );
      `);
    } catch {
      // sqlite-vec extension not available — fall back to brute-force search
    }
  }

  /** Search for similar memories using cosine similarity */
  search(queryEmbedding: Float32Array, topK: number): MemorySearchResult[] {
    // Try vector table first
    try {
      const rows = this.db.prepare(`
        SELECT m.*, v.distance
        FROM memory_vec v
        JOIN memories m ON m.id = v.id
        WHERE v.embedding MATCH ?
        ORDER BY v.distance
        LIMIT ?
      `).all(Buffer.from(queryEmbedding.buffer), topK) as Array<Record<string, unknown> & { distance: number }>;

      return rows.map(row => ({
        entry: this.rowToEntry(row),
        score: 1 - (row.distance ?? 0), // Convert distance to similarity
      }));
    } catch {
      // Fallback: brute-force cosine similarity
      return this.bruteForcSearch(queryEmbedding, topK);
    }
  }

  /** Brute-force cosine similarity search (fallback when sqlite-vec not available) */
  private bruteForcSearch(queryEmbedding: Float32Array, topK: number): MemorySearchResult[] {
    const rows = this.db.prepare('SELECT * FROM memories').all() as Array<Record<string, unknown>>;

    const scored = rows.map(row => {
      const stored = new Float32Array(
        (row.embedding as Buffer).buffer,
        (row.embedding as Buffer).byteOffset,
        (row.embedding as Buffer).byteLength / 4
      );
      const score = cosineSimilarity(queryEmbedding, stored);
      return { entry: this.rowToEntry(row), score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  /** Insert a new memory entry */
  insert(entry: Omit<MemoryEntry, 'id'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO memories (content, embedding, importance, source, topic, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      entry.content,
      Buffer.from(entry.embedding.buffer),
      entry.importance,
      entry.source,
      entry.topic ?? null,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
      entry.created_at,
    );

    // Also insert into vector table if available
    try {
      this.db.prepare(`
        INSERT INTO memory_vec (id, embedding)
        VALUES (?, ?)
      `).run(result.lastInsertRowid, Buffer.from(entry.embedding.buffer));
    } catch {
      // sqlite-vec not available
    }
  }

  /** Get total number of memories */
  count(): number {
    const row = this.db.prepare('SELECT COUNT(*) as cnt FROM memories').get() as { cnt: number };
    return row.cnt;
  }

  /** Close the database */
  close(): void {
    this.db.close();
  }

  private rowToEntry(row: Record<string, unknown>): MemoryEntry {
    const embeddingBuf = row.embedding as Buffer;
    return {
      id: row.id as number,
      content: row.content as string,
      embedding: new Float32Array(embeddingBuf.buffer, embeddingBuf.byteOffset, embeddingBuf.byteLength / 4),
      importance: row.importance as number,
      source: row.source as MemoryEntry['source'],
      topic: row.topic as string | undefined,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
      created_at: row.created_at as string,
      accessed_at: row.accessed_at as string | undefined,
    };
  }
}

/** Compute cosine similarity between two vectors */
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
