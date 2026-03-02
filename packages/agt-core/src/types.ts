// ============================================================
// AGT Core Types
// All TypeScript interfaces for the .agt file format
// ============================================================

/** Author information */
export interface Author {
  name?: string;
  url?: string;
}

/** Agent usage statistics */
export interface AgentStats {
  total_conversations: number;
  memory_entries: number;
  knowledge_nodes: number;
}

/** File map in manifest — which optional files are present */
export interface FileMap {
  persona: string;
  model_spec: string;
  memory?: string;
  knowledge?: string;
  domain?: string;
  mcp_config?: string;
  appearance?: string;
}

/** manifest.json — the entry point of every .agt file */
export interface Manifest {
  agt_version: string;
  name: string;
  id: string;
  created_at: string;
  updated_at: string;
  author?: Author;
  description: string;
  tags?: string[];
  stats?: AgentStats;
  files: FileMap;
  checksum: string;
  license?: string;
}

/** Communication style configuration */
export interface CommunicationStyle {
  tone: 'professional' | 'casual' | 'academic' | 'friendly' | 'formal';
  language?: string;
  formality: 'formal' | 'informal' | 'adaptive';
}

/** Few-shot conversation example */
export interface ConversationExample {
  user: string;
  assistant: string;
}

/** persona.json — agent personality and behavior */
export interface Persona {
  system_prompt: string;
  name: string;
  role?: string;
  traits?: string[];
  communication_style?: CommunicationStyle;
  constraints?: string[];
  examples?: ConversationExample[];
}

/** Inference model requirements */
export interface InferenceSpec {
  preferred: string;
  minimum_params?: string;
  context_length?: number;
  capabilities?: ('chat' | 'tool_use' | 'vision' | 'code')[];
  fallback?: string[];
}

/** Embedding model requirements */
export interface EmbeddingSpec {
  model: string;
  dimensions: number;
}

/** model-spec.json — LLM and embedding model requirements */
export interface ModelSpec {
  inference: InferenceSpec;
  embedding: EmbeddingSpec;
  temperature?: number;
  top_p?: number;
}

/** domain.json — domain expertise configuration */
export interface Domain {
  name: string;
  expertise_level?: 'novice' | 'intermediate' | 'specialist' | 'expert';
  topics?: string[];
  evidence_standards?: 'anecdotal' | 'professional' | 'peer-reviewed' | 'systematic-review';
  terminology_preference?: 'layperson' | 'professional' | 'academic';
}

/** MCP server configuration */
export interface McpServer {
  name: string;
  transport: 'stdio' | 'sse';
  command: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  description?: string;
}

/** MCP permission configuration */
export interface McpPermissions {
  network?: string[];
  filesystem?: 'none' | 'read' | 'write';
}

/** mcp-config.json — MCP tool connections */
export interface McpConfig {
  servers: McpServer[];
  permissions?: McpPermissions;
}

// ============================================================
// Appearance — 2D procedural agent visual identity
// ============================================================

/** 7 structural face parameters (0-1 normalized) */
export interface FaceParams {
  head_shape: number;
  eye_size: number;
  eye_spacing: number;
  nose_size: number;
  mouth_width: number;
  brow_thickness: number;
  chin_length: number;
}

/** Agent color palette */
export interface AppearanceColors {
  skin: string;   // hex #RRGGBB
  hair: string;
  eye: string;
  outfit: string;
}

/** Outfit configuration */
export interface OutfitConfig {
  style?: 'casual' | 'formal' | 'lab-coat' | 'hoodie' | 'suit' | 'hanbok';
  accessories?: string[];
}

/** Big Five personality traits affecting expression intensity */
export interface PersonalityVisual {
  openness?: number;
  conscientiousness?: number;
  extraversion?: number;
  agreeableness?: number;
  neuroticism?: number;
}

/** 14 expression parameters for a single emotion basis */
export interface ExpressionBasis {
  eye_openness?: number;
  pupil_dilation?: number;
  brow_raise?: number;
  brow_furrow?: number;
  mouth_curve?: number;
  mouth_open?: number;
  cheek_puff?: number;
  head_tilt?: number;
  head_nod?: number;
  body_lean?: number;
  shoulder_raise?: number;
  gesture_intensity?: number;
  blink_rate?: number;
  breath_rate?: number;
}

/** Plutchik 8-vector emotion bases (custom overrides) */
export interface EmotionBases {
  joy?: ExpressionBasis;
  anger?: ExpressionBasis;
  sadness?: ExpressionBasis;
  surprise?: ExpressionBasis;
  disgust?: ExpressionBasis;
  fear?: ExpressionBasis;
  trust?: ExpressionBasis;
  anticipation?: ExpressionBasis;
}

/** appearance.json — 2D procedural agent visual appearance */
export interface Appearance {
  face_params: FaceParams;
  colors: AppearanceColors;
  outfit?: OutfitConfig;
  personality_visual?: PersonalityVisual;
  emotion_bases?: EmotionBases;
}

/** Knowledge graph node */
export interface KnowledgeNode {
  id: string;
  label: string;
  type: string;
  properties?: Record<string, unknown>;
}

/** Knowledge graph edge */
export interface KnowledgeEdge {
  source: string;
  target: string;
  relation: string;
  weight?: number;
}

/** knowledge.json — structured knowledge graph */
export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

/** Memory entry in sqlite-vec database */
export interface MemoryEntry {
  id: number;
  content: string;
  embedding: Float32Array;
  importance: number;
  source: 'conversation' | 'training' | 'imported';
  topic?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  accessed_at?: string;
}

/** Complete agent bundle — all data loaded from an .agt file */
export interface AgentBundle {
  manifest: Manifest;
  persona: Persona;
  modelSpec: ModelSpec;
  domain?: Domain;
  mcpConfig?: McpConfig;
  knowledge?: KnowledgeGraph;
  appearance?: Appearance;
  memoryDbPath?: string;
  assetsDir?: string;
  /** Original .agt file path (for saving back) */
  sourceFilePath: string;
  /** Directory where the .agt was extracted */
  extractDir: string;
}

/** Validation result */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
  code: string;
}

/** LLM provider interface */
export interface LLMProvider {
  chat(messages: ChatMessage[], options?: LLMOptions): Promise<ChatResponse>;
  embed(text: string): Promise<number[]>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatResponse {
  content: string;
  tool_calls?: ToolCall[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export interface LLMOptions {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  tools?: ToolDefinition[];
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}
