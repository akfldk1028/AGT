import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { writeFile, mkdir } from 'node:fs/promises';
import JSZip from 'jszip';
import {
  ManifestSchema,
  PersonaSchema,
  ModelSpecSchema,
  DomainSchema,
  McpConfigSchema,
  KnowledgeGraphSchema,
  AppearanceSchema,
  REQUIRED_FILES,
  AGT_VERSION,
} from '@agt/core';
import type { AgentBundle, Manifest, Persona, ModelSpec, Domain, McpConfig, KnowledgeGraph, Appearance } from '@agt/core';

export class LoadError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'LoadError';
  }
}

/** Load and validate an .agt file, returning an AgentBundle */
export async function loadAgtFile(filePath: string): Promise<AgentBundle> {
  // 1. Read the file
  const data = await readFile(filePath);

  // 2. Open as zip
  const zip = await JSZip.loadAsync(data).catch(() => {
    throw new LoadError('Invalid .agt file: not a valid zip archive', 'INVALID_ZIP');
  });

  // 3. Check required files
  for (const required of REQUIRED_FILES) {
    if (!zip.file(required)) {
      throw new LoadError(`Missing required file: ${required}`, 'MISSING_FILE');
    }
  }

  // 4. Parse manifest
  const manifestRaw = await zip.file('manifest.json')!.async('string');
  const manifestJson = JSON.parse(manifestRaw);
  const manifestResult = ManifestSchema.safeParse(manifestJson);
  if (!manifestResult.success) {
    throw new LoadError(
      `Invalid manifest.json: ${manifestResult.error.issues.map(i => i.message).join(', ')}`,
      'INVALID_MANIFEST'
    );
  }
  const manifest: Manifest = manifestResult.data;

  // 5. Check version compatibility
  const [major] = manifest.agt_version.split('.').map(Number);
  const [currentMajor] = AGT_VERSION.split('.').map(Number);
  if (major > currentMajor) {
    throw new LoadError(
      `Unsupported AGT version ${manifest.agt_version} (runtime supports ${AGT_VERSION})`,
      'VERSION_MISMATCH'
    );
  }

  // 6. Verify checksum
  const computedChecksum = await computeChecksum(zip);
  if (manifest.checksum !== computedChecksum) {
    throw new LoadError(
      `Checksum mismatch: expected ${manifest.checksum}, got ${computedChecksum}`,
      'CHECKSUM_MISMATCH'
    );
  }

  // 7. Extract to temp directory
  const extractDir = await mkdtemp(join(tmpdir(), 'agt-'));
  for (const [relativePath, file] of Object.entries(zip.files)) {
    if (file.dir) {
      await mkdir(join(extractDir, relativePath), { recursive: true });
      continue;
    }
    const content = await file.async('nodebuffer');
    const targetPath = join(extractDir, relativePath);
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, content);
  }

  // 8. Parse required JSON files
  const personaRaw = await zip.file('persona.json')!.async('string');
  const persona = PersonaSchema.parse(JSON.parse(personaRaw)) as Persona;

  const modelSpecRaw = await zip.file('model-spec.json')!.async('string');
  const modelSpec = ModelSpecSchema.parse(JSON.parse(modelSpecRaw)) as ModelSpec;

  // 9. Parse optional files
  let domain: Domain | undefined;
  if (zip.file('domain.json')) {
    const raw = await zip.file('domain.json')!.async('string');
    domain = DomainSchema.parse(JSON.parse(raw));
  }

  let mcpConfig: McpConfig | undefined;
  if (zip.file('mcp-config.json')) {
    const raw = await zip.file('mcp-config.json')!.async('string');
    mcpConfig = McpConfigSchema.parse(JSON.parse(raw));
  }

  let knowledge: KnowledgeGraph | undefined;
  if (zip.file('knowledge.json')) {
    const raw = await zip.file('knowledge.json')!.async('string');
    knowledge = KnowledgeGraphSchema.parse(JSON.parse(raw));
  }

  let appearance: Appearance | undefined;
  if (zip.file('appearance.json')) {
    const raw = await zip.file('appearance.json')!.async('string');
    appearance = AppearanceSchema.parse(JSON.parse(raw));
  }

  const memoryDbPath = zip.file('memory.db') ? join(extractDir, 'memory.db') : undefined;

  // zip.folder() always returns a JSZip object, so check if any files exist under assets/
  let assetsDir: string | undefined;
  const assetFiles: string[] = [];
  zip.forEach((path) => { if (path.startsWith('assets/')) assetFiles.push(path); });
  if (assetFiles.length > 0) {
    assetsDir = join(extractDir, 'assets');
  }

  return {
    manifest,
    persona,
    modelSpec,
    domain,
    mcpConfig,
    knowledge,
    appearance,
    memoryDbPath,
    assetsDir,
    sourceFilePath: filePath,
    extractDir,
  };
}

/** Compute SHA-256 checksum of all files except manifest.json */
export async function computeChecksum(zip: JSZip): Promise<string> {
  const files: string[] = [];
  zip.forEach((relativePath, file) => {
    if (!file.dir && relativePath !== 'manifest.json') {
      files.push(relativePath);
    }
  });
  files.sort();

  const hashes: string[] = [];
  for (const filePath of files) {
    const content = await zip.file(filePath)!.async('nodebuffer');
    const hash = createHash('sha256').update(content).digest('hex');
    hashes.push(hash);
  }

  const combined = createHash('sha256').update(hashes.join('')).digest('hex');
  return `sha256:${combined}`;
}
