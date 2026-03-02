import type { McpConfig, McpServer, ToolDefinition } from '@agt/core';
import { ToolBridge } from './tool-bridge.js';

export interface McpManagerOptions {
  config: McpConfig;
}

/** MCP manager — connects to MCP servers and bridges tools to the agent */
export class McpManager {
  private bridges: Map<string, ToolBridge> = new Map();
  private config: McpConfig;

  constructor(options: McpManagerOptions) {
    this.config = options.config;
  }

  /** Connect to all configured MCP servers */
  async connect(): Promise<{ connected: string[]; failed: string[] }> {
    const connected: string[] = [];
    const failed: string[] = [];

    for (const server of this.config.servers) {
      try {
        const bridge = new ToolBridge(server);
        await bridge.connect();
        this.bridges.set(server.name, bridge);
        connected.push(server.name);
      } catch (err) {
        console.error(`Failed to connect to MCP server "${server.name}":`, err);
        failed.push(server.name);
      }
    }

    return { connected, failed };
  }

  /** Get all available tools from connected servers */
  async listTools(): Promise<ToolDefinition[]> {
    const tools: ToolDefinition[] = [];
    for (const bridge of this.bridges.values()) {
      const serverTools = await bridge.listTools();
      tools.push(...serverTools);
    }
    return tools;
  }

  /** Execute a tool call */
  async executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    for (const bridge of this.bridges.values()) {
      const result = await bridge.executeTool(name, args);
      if (result !== undefined) return result;
    }
    throw new Error(`Tool "${name}" not found in any connected MCP server`);
  }

  /** Disconnect all servers */
  async disconnect(): Promise<void> {
    for (const bridge of this.bridges.values()) {
      await bridge.disconnect();
    }
    this.bridges.clear();
  }
}
