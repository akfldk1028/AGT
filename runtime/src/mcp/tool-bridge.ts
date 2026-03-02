import { spawn, type ChildProcess } from 'node:child_process';
import type { McpServer, ToolDefinition } from '@agt/core';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

/** Bridge between an MCP server and the agent's tool system */
export class ToolBridge {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, {
    resolve: (value: unknown) => void;
    reject: (reason: Error) => void;
  }>();
  private buffer = '';
  private tools: ToolDefinition[] = [];

  constructor(private server: McpServer) {}

  /** Connect to the MCP server via stdio */
  async connect(): Promise<void> {
    if (this.server.transport !== 'stdio') {
      throw new Error(`Transport "${this.server.transport}" not yet supported (only stdio)`);
    }

    this.process = spawn(this.server.command, this.server.args ?? [], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...this.server.env },
    });

    this.process.stdout?.on('data', (data: Buffer) => {
      this.buffer += data.toString();
      this.processBuffer();
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      console.error(`[MCP:${this.server.name}] ${data.toString()}`);
    });

    this.process.on('exit', (code) => {
      console.error(`[MCP:${this.server.name}] exited with code ${code}`);
      for (const pending of this.pendingRequests.values()) {
        pending.reject(new Error('MCP server process exited'));
      }
      this.pendingRequests.clear();
    });

    // Initialize the MCP connection
    await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'agt-runtime', version: '0.1.0' },
    });

    // Send initialized notification
    this.sendNotification('notifications/initialized');

    // Discover tools
    const result = await this.sendRequest('tools/list', {}) as { tools: Array<{
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
    }> };

    this.tools = (result.tools ?? []).map(t => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      },
    }));
  }

  /** List available tools from this server */
  async listTools(): Promise<ToolDefinition[]> {
    return this.tools;
  }

  /** Execute a tool call */
  async executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const tool = this.tools.find(t => t.function.name === name);
    if (!tool) return undefined;

    const result = await this.sendRequest('tools/call', {
      name,
      arguments: args,
    });

    return result;
  }

  /** Disconnect from the MCP server */
  async disconnect(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }

  private sendRequest(method: string, params?: unknown, timeoutMs = 30_000): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };

      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`MCP request "${method}" timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(id, {
        resolve: (value) => { clearTimeout(timer); resolve(value); },
        reject: (err) => { clearTimeout(timer); reject(err); },
      });
      this.process?.stdin?.write(JSON.stringify(request) + '\n');
    });
  }

  private sendNotification(method: string, params?: unknown): void {
    const notification = {
      jsonrpc: '2.0',
      method,
      params,
    };
    this.process?.stdin?.write(JSON.stringify(notification) + '\n');
  }

  private processBuffer(): void {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const response = JSON.parse(line) as JsonRpcResponse;
        if (response.id !== undefined) {
          const pending = this.pendingRequests.get(response.id);
          if (pending) {
            this.pendingRequests.delete(response.id);
            if (response.error) {
              pending.reject(new Error(response.error.message));
            } else {
              pending.resolve(response.result);
            }
          }
        }
      } catch {
        // Not valid JSON, ignore
      }
    }
  }
}
