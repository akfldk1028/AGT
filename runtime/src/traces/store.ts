// ============================================================
// AGT Trace Store — SQLite persistence for trace data
// ============================================================

import type { Trace, TraceStep } from './index.js';

/**
 * Persists trace data to SQLite.
 * Lightweight wrapper — uses the same better-sqlite3 pattern as memory.
 */
export class TraceStore {
  private db: import('better-sqlite3').Database | null = null;

  constructor(private readonly dbPath: string) {}

  /** Initialize DB and create tables if needed */
  private async ensureDb(): Promise<import('better-sqlite3').Database> {
    if (this.db) return this.db;

    const Database = (await import('better-sqlite3')).default;
    this.db = new Database(this.dbPath);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS traces (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS trace_steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trace_id INTEGER NOT NULL REFERENCES traces(id),
        type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        data TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_traces_agent ON traces(agent_id);
      CREATE INDEX IF NOT EXISTS idx_steps_trace ON trace_steps(trace_id);
    `);

    return this.db;
  }

  /** Save a complete trace */
  async save(trace: Trace): Promise<number> {
    const db = await this.ensureDb();

    const insertTrace = db.prepare(
      'INSERT INTO traces (agent_id, session_id, started_at) VALUES (?, ?, ?)',
    );
    const insertStep = db.prepare(
      'INSERT INTO trace_steps (trace_id, type, timestamp, data) VALUES (?, ?, ?, ?)',
    );

    const result = db.transaction(() => {
      const { lastInsertRowid } = insertTrace.run(
        trace.agentId,
        trace.sessionId,
        trace.startedAt,
      );
      const traceId = Number(lastInsertRowid);

      for (const step of trace.steps) {
        insertStep.run(traceId, step.type, step.timestamp, JSON.stringify(step.data));
      }

      return traceId;
    })();

    return result;
  }

  /** Load traces for an agent */
  async loadByAgent(agentId: string, limit = 50): Promise<Trace[]> {
    const db = await this.ensureDb();

    const rows = db
      .prepare('SELECT * FROM traces WHERE agent_id = ? ORDER BY started_at DESC LIMIT ?')
      .all(agentId, limit) as Array<{ id: number; agent_id: string; session_id: string; started_at: number }>;

    const stepsStmt = db.prepare(
      'SELECT type, timestamp, data FROM trace_steps WHERE trace_id = ? ORDER BY timestamp',
    );

    return rows.map((row) => {
      const stepRows = stepsStmt.all(row.id) as Array<{ type: string; timestamp: number; data: string }>;
      return {
        agentId: row.agent_id,
        sessionId: row.session_id,
        startedAt: row.started_at,
        steps: stepRows.map((s) => ({
          type: s.type as TraceStep['type'],
          timestamp: s.timestamp,
          data: JSON.parse(s.data),
        })),
      };
    });
  }

  /** Close the database connection */
  async close(): Promise<void> {
    this.db?.close();
    this.db = null;
  }
}
