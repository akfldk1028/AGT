// @agt/core — Main export
// Types, schemas, constants, errors, and events for the .agt file format

// Errors
export {
  AgtError,
  ValidationError,
  LoadError,
  LLMError,
  MemoryError,
  PackageError,
} from './errors.js';

// Events
export {
  EventBus,
  bus,
} from './events.js';

export type {
  AgtEventType,
  AgtEvent,
} from './events.js';

export type {
  Author,
  AgentStats,
  FileMap,
  Manifest,
  CommunicationStyle,
  ConversationExample,
  Persona,
  InferenceSpec,
  EmbeddingSpec,
  ModelSpec,
  Domain,
  McpServer,
  McpPermissions,
  McpConfig,
  FaceParams,
  AppearanceColors,
  OutfitConfig,
  PersonalityVisual,
  ExpressionBasis,
  EmotionBases,
  Appearance,
  KnowledgeNode,
  KnowledgeEdge,
  KnowledgeGraph,
  MemoryEntry,
  AgentBundle,
  ValidationResult,
  ValidationIssue,
  ValidationWarning,
  LLMProvider,
  ChatMessage,
  ToolCall,
  ChatResponse,
  LLMOptions,
  ToolDefinition,
} from './types.js';

export {
  ManifestSchema,
  PersonaSchema,
  ModelSpecSchema,
  DomainSchema,
  McpConfigSchema,
  KnowledgeGraphSchema,
  AppearanceSchema,
  AuthorSchema,
  AgentStatsSchema,
  FileMapSchema,
  CommunicationStyleSchema,
  ConversationExampleSchema,
  InferenceSpecSchema,
  EmbeddingSpecSchema,
  McpServerSchema,
  McpPermissionsSchema,
  KnowledgeNodeSchema,
  KnowledgeEdgeSchema,
  FaceParamsSchema,
  AppearanceColorsSchema,
  OutfitConfigSchema,
  PersonalityVisualSchema,
  ExpressionBasisSchema,
  EmotionBasesSchema,
} from './schema.js';

export type {
  ManifestZ,
  PersonaZ,
  ModelSpecZ,
  DomainZ,
  McpConfigZ,
  KnowledgeGraphZ,
  AppearanceZ,
} from './schema.js';

export {
  AGT_VERSION,
  AGT_EXTENSION,
  AGT_MIME_TYPE,
  REQUIRED_FILES,
  KNOWN_FILES,
  MAX_FILE_SIZE,
  DEFAULT_MODEL,
  DEFAULT_EMBEDDING_MODEL,
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_TEMPERATURE,
  DEFAULT_TOP_P,
  DEFAULT_CONTEXT_LENGTH,
  OLLAMA_BASE_URL,
  CHECKSUM_ALGORITHM,
  ASSETS_DIR,
  MEMORY_SOURCES,
  INFERENCE_CAPABILITIES,
} from './constants.js';
