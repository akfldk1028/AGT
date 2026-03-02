import type { KnowledgeGraph, KnowledgeNode, KnowledgeEdge } from '@agt/core';

export interface KnowledgeQueryResult {
  node: KnowledgeNode;
  neighbors: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

/** Load and query a knowledge graph from knowledge.json */
export class KnowledgeGraphManager {
  private nodeMap: Map<string, KnowledgeNode>;
  private edgesBySource: Map<string, KnowledgeEdge[]>;
  private edgesByTarget: Map<string, KnowledgeEdge[]>;

  constructor(private graph: KnowledgeGraph) {
    this.nodeMap = new Map(graph.nodes.map(n => [n.id, n]));

    this.edgesBySource = new Map();
    this.edgesByTarget = new Map();
    for (const edge of graph.edges) {
      if (!this.edgesBySource.has(edge.source)) this.edgesBySource.set(edge.source, []);
      this.edgesBySource.get(edge.source)!.push(edge);

      if (!this.edgesByTarget.has(edge.target)) this.edgesByTarget.set(edge.target, []);
      this.edgesByTarget.get(edge.target)!.push(edge);
    }
  }

  /** Get a node by ID */
  getNode(id: string): KnowledgeNode | undefined {
    return this.nodeMap.get(id);
  }

  /** Find nodes matching a text query (simple label/type search) */
  findNodes(query: string): KnowledgeNode[] {
    const lower = query.toLowerCase();
    return this.graph.nodes.filter(
      n => n.label.toLowerCase().includes(lower) || n.type.toLowerCase().includes(lower)
    );
  }

  /** Get a node with its immediate neighborhood */
  query(nodeId: string): KnowledgeQueryResult | undefined {
    const node = this.nodeMap.get(nodeId);
    if (!node) return undefined;

    const outEdges = this.edgesBySource.get(nodeId) ?? [];
    const inEdges = this.edgesByTarget.get(nodeId) ?? [];
    const allEdges = [...outEdges, ...inEdges];

    const neighborIds = new Set<string>();
    for (const edge of allEdges) {
      if (edge.source !== nodeId) neighborIds.add(edge.source);
      if (edge.target !== nodeId) neighborIds.add(edge.target);
    }

    const neighbors = [...neighborIds]
      .map(id => this.nodeMap.get(id))
      .filter((n): n is KnowledgeNode => n !== undefined);

    return { node, neighbors, edges: allEdges };
  }

  /** Get all nodes of a specific type */
  getByType(type: string): KnowledgeNode[] {
    return this.graph.nodes.filter(n => n.type === type);
  }

  /** Get edges between two nodes */
  getEdges(sourceId: string, targetId: string): KnowledgeEdge[] {
    return this.graph.edges.filter(
      e => (e.source === sourceId && e.target === targetId) ||
           (e.source === targetId && e.target === sourceId)
    );
  }

  /** Total number of nodes */
  get nodeCount(): number {
    return this.graph.nodes.length;
  }

  /** Total number of edges */
  get edgeCount(): number {
    return this.graph.edges.length;
  }
}
