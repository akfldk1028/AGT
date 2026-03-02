import { z } from 'zod';

// ============================================================
// AGT Zod Schemas — Runtime validation matching types.ts
// ============================================================

export const AuthorSchema = z.object({
  name: z.string().optional(),
  url: z.string().url().optional(),
});

export const AgentStatsSchema = z.object({
  total_conversations: z.number().int().min(0),
  memory_entries: z.number().int().min(0),
  knowledge_nodes: z.number().int().min(0),
});

export const FileMapSchema = z.object({
  persona: z.string(),
  model_spec: z.string(),
  memory: z.string().optional(),
  knowledge: z.string().optional(),
  domain: z.string().optional(),
  mcp_config: z.string().optional(),
  appearance: z.string().optional(),
});

export const ManifestSchema = z.object({
  agt_version: z.string().regex(/^\d+\.\d+\.\d+$/),
  name: z.string().min(1).max(200),
  id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  author: AuthorSchema.optional(),
  description: z.string().max(2000),
  tags: z.array(z.string().max(50)).max(20).optional(),
  stats: AgentStatsSchema.optional(),
  files: FileMapSchema,
  checksum: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  license: z.string().optional(),
});

export const CommunicationStyleSchema = z.object({
  tone: z.enum(['professional', 'casual', 'academic', 'friendly', 'formal']),
  language: z.string().optional(),
  formality: z.enum(['formal', 'informal', 'adaptive']),
});

export const ConversationExampleSchema = z.object({
  user: z.string(),
  assistant: z.string(),
});

export const PersonaSchema = z.object({
  system_prompt: z.string().min(1),
  name: z.string().min(1).max(100),
  role: z.string().max(200).optional(),
  traits: z.array(z.string().max(50)).max(20).optional(),
  communication_style: CommunicationStyleSchema.optional(),
  constraints: z.array(z.string()).optional(),
  examples: z.array(ConversationExampleSchema).optional(),
});

export const InferenceSpecSchema = z.object({
  preferred: z.string(),
  minimum_params: z.string().optional(),
  context_length: z.number().int().min(1024).optional(),
  capabilities: z.array(z.enum(['chat', 'tool_use', 'vision', 'code'])).optional(),
  fallback: z.array(z.string()).optional(),
});

export const EmbeddingSpecSchema = z.object({
  model: z.string(),
  dimensions: z.number().int().min(1),
});

export const ModelSpecSchema = z.object({
  inference: InferenceSpecSchema,
  embedding: EmbeddingSpecSchema,
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
});

export const DomainSchema = z.object({
  name: z.string().min(1),
  expertise_level: z.enum(['novice', 'intermediate', 'specialist', 'expert']).optional(),
  topics: z.array(z.string()).optional(),
  evidence_standards: z.enum(['anecdotal', 'professional', 'peer-reviewed', 'systematic-review']).optional(),
  terminology_preference: z.enum(['layperson', 'professional', 'academic']).optional(),
});

export const McpServerSchema = z.object({
  name: z.string(),
  transport: z.enum(['stdio', 'sse']),
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  url: z.string().url().optional(),
  description: z.string().optional(),
});

export const McpPermissionsSchema = z.object({
  network: z.array(z.string()).optional(),
  filesystem: z.enum(['none', 'read', 'write']).optional(),
});

export const McpConfigSchema = z.object({
  servers: z.array(McpServerSchema),
  permissions: McpPermissionsSchema.optional(),
});

// ============================================================
// Appearance schemas
// ============================================================

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

export const FaceParamsSchema = z.object({
  head_shape: z.number().min(0).max(1),
  eye_size: z.number().min(0).max(1),
  eye_spacing: z.number().min(0).max(1),
  nose_size: z.number().min(0).max(1),
  mouth_width: z.number().min(0).max(1),
  brow_thickness: z.number().min(0).max(1),
  chin_length: z.number().min(0).max(1),
});

export const AppearanceColorsSchema = z.object({
  skin: hexColor,
  hair: hexColor,
  eye: hexColor,
  outfit: hexColor,
});

export const OutfitConfigSchema = z.object({
  style: z.enum(['casual', 'formal', 'lab-coat', 'hoodie', 'suit', 'hanbok']).optional(),
  accessories: z.array(z.string()).optional(),
});

export const PersonalityVisualSchema = z.object({
  openness: z.number().min(0).max(1).optional(),
  conscientiousness: z.number().min(0).max(1).optional(),
  extraversion: z.number().min(0).max(1).optional(),
  agreeableness: z.number().min(0).max(1).optional(),
  neuroticism: z.number().min(0).max(1).optional(),
});

export const ExpressionBasisSchema = z.object({
  eye_openness: z.number().min(0).max(1).optional(),
  pupil_dilation: z.number().min(0).max(1).optional(),
  brow_raise: z.number().min(-1).max(1).optional(),
  brow_furrow: z.number().min(0).max(1).optional(),
  mouth_curve: z.number().min(-1).max(1).optional(),
  mouth_open: z.number().min(0).max(1).optional(),
  cheek_puff: z.number().min(0).max(1).optional(),
  head_tilt: z.number().min(-1).max(1).optional(),
  head_nod: z.number().min(-1).max(1).optional(),
  body_lean: z.number().min(-1).max(1).optional(),
  shoulder_raise: z.number().min(0).max(1).optional(),
  gesture_intensity: z.number().min(0).max(1).optional(),
  blink_rate: z.number().min(0.05).max(2.0).optional(),
  breath_rate: z.number().min(0.05).max(1.0).optional(),
});

export const EmotionBasesSchema = z.object({
  joy: ExpressionBasisSchema.optional(),
  anger: ExpressionBasisSchema.optional(),
  sadness: ExpressionBasisSchema.optional(),
  surprise: ExpressionBasisSchema.optional(),
  disgust: ExpressionBasisSchema.optional(),
  fear: ExpressionBasisSchema.optional(),
  trust: ExpressionBasisSchema.optional(),
  anticipation: ExpressionBasisSchema.optional(),
});

export const AppearanceSchema = z.object({
  face_params: FaceParamsSchema,
  colors: AppearanceColorsSchema,
  outfit: OutfitConfigSchema.optional(),
  personality_visual: PersonalityVisualSchema.optional(),
  emotion_bases: EmotionBasesSchema.optional(),
});

export const KnowledgeNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.string(),
  properties: z.record(z.unknown()).optional(),
});

export const KnowledgeEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  relation: z.string(),
  weight: z.number().optional(),
});

export const KnowledgeGraphSchema = z.object({
  nodes: z.array(KnowledgeNodeSchema),
  edges: z.array(KnowledgeEdgeSchema),
});

// ============================================================
// Schema type inference — use these instead of manual types
// ============================================================

export type ManifestZ = z.infer<typeof ManifestSchema>;
export type PersonaZ = z.infer<typeof PersonaSchema>;
export type ModelSpecZ = z.infer<typeof ModelSpecSchema>;
export type DomainZ = z.infer<typeof DomainSchema>;
export type McpConfigZ = z.infer<typeof McpConfigSchema>;
export type KnowledgeGraphZ = z.infer<typeof KnowledgeGraphSchema>;
export type AppearanceZ = z.infer<typeof AppearanceSchema>;
