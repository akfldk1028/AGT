/** Current AGT format version */
export const AGT_VERSION = '1.0.0';

/** File extension (without dot) */
export const AGT_EXTENSION = 'agt';

/** MIME type */
export const AGT_MIME_TYPE = 'application/x-agt';

/** Required files in every .agt archive */
export const REQUIRED_FILES = ['manifest.json', 'persona.json', 'model-spec.json'] as const;

/** All recognized files in an .agt archive */
export const KNOWN_FILES = [
  'manifest.json',
  'persona.json',
  'model-spec.json',
  'memory.db',
  'knowledge.json',
  'domain.json',
  'mcp-config.json',
  'appearance.json',
] as const;

/** Maximum recommended .agt file size in bytes (500MB) */
export const MAX_FILE_SIZE = 500 * 1024 * 1024;

/** Default inference model */
export const DEFAULT_MODEL = 'qwen3:8b';

/** Default embedding model */
export const DEFAULT_EMBEDDING_MODEL = 'nomic-embed-text';

/** Default embedding dimensions */
export const DEFAULT_EMBEDDING_DIMENSIONS = 768;

/** Default temperature */
export const DEFAULT_TEMPERATURE = 0.7;

/** Default top_p */
export const DEFAULT_TOP_P = 0.9;

/** Default context length */
export const DEFAULT_CONTEXT_LENGTH = 8192;

/** Ollama default base URL */
export const OLLAMA_BASE_URL = 'http://localhost:11434';

/** Checksum algorithm */
export const CHECKSUM_ALGORITHM = 'sha256';

/** Assets directory name inside .agt */
export const ASSETS_DIR = 'assets';

/** Memory source types */
export const MEMORY_SOURCES = ['conversation', 'training', 'imported'] as const;

/** Supported inference capabilities */
export const INFERENCE_CAPABILITIES = ['chat', 'tool_use', 'vision', 'code'] as const;
