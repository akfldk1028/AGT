import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import JSZip from 'jszip';
import {
  ManifestSchema,
  PersonaSchema,
  ModelSpecSchema,
  DomainSchema,
  McpConfigSchema,
  KnowledgeGraphSchema,
  AppearanceSchema,
  AGT_VERSION,
  REQUIRED_FILES,
} from '@agt/core';
import type { Manifest } from '@agt/core';

export interface PackOptions {
  /** Source directory containing agent files */
  sourceDir: string;
  /** Output .agt file path */
  outputPath: string;
  /** Override manifest fields */
  overrides?: Partial<Manifest>;
}

export interface PackResult {
  outputPath: string;
  fileCount: number;
  totalSize: number;
}

/** Pack a directory into an .agt file */
export async function pack(options: PackOptions): Promise<PackResult> {
  const { sourceDir, outputPath, overrides } = options;
  const zip = new JSZip();

  // 1. Validate required files exist
  for (const required of REQUIRED_FILES) {
    if (required === 'manifest.json') continue; // Will be generated
    try {
      await stat(join(sourceDir, required));
    } catch {
      throw new Error(`Missing required file: ${required}`);
    }
  }

  // 2. Read and validate persona.json
  const personaRaw = await readFile(join(sourceDir, 'persona.json'), 'utf-8');
  const persona = PersonaSchema.parse(JSON.parse(personaRaw));
  zip.file('persona.json', JSON.stringify(persona, null, 2));

  // 3. Read and validate model-spec.json
  const modelSpecRaw = await readFile(join(sourceDir, 'model-spec.json'), 'utf-8');
  const modelSpec = ModelSpecSchema.parse(JSON.parse(modelSpecRaw));
  zip.file('model-spec.json', JSON.stringify(modelSpec, null, 2));

  // 4. Read optional files
  const fileMap: Record<string, string> = {
    persona: 'persona.json',
    model_spec: 'model-spec.json',
  };

  const optionalFiles = [
    { key: 'domain', file: 'domain.json', schema: DomainSchema },
    { key: 'mcp_config', file: 'mcp-config.json', schema: McpConfigSchema },
    { key: 'knowledge', file: 'knowledge.json', schema: KnowledgeGraphSchema },
    { key: 'appearance', file: 'appearance.json', schema: AppearanceSchema },
  ] as const;

  for (const { key, file, schema } of optionalFiles) {
    try {
      const raw = await readFile(join(sourceDir, file), 'utf-8');
      const parsed = schema.parse(JSON.parse(raw));
      zip.file(file, JSON.stringify(parsed, null, 2));
      (fileMap as Record<string, string>)[key] = file;
    } catch {
      // Optional file not present or invalid
    }
  }

  // 5. Add memory.db if present
  try {
    const memoryDb = await readFile(join(sourceDir, 'memory.db'));
    zip.file('memory.db', memoryDb);
    fileMap.memory = 'memory.db';
  } catch {
    // No memory database
  }

  // 6. Add assets directory if present
  try {
    const assetsDir = join(sourceDir, 'assets');
    const assetsStat = await stat(assetsDir);
    if (assetsStat.isDirectory()) {
      await addDirectoryToZip(zip, assetsDir, 'assets');
    }
  } catch {
    // No assets directory
  }

  // 7. Compute checksum
  const checksum = await computeZipChecksum(zip);

  // 8. Build manifest (overrides applied first, then checksum/files forced to computed values)
  const now = new Date().toISOString();
  const manifest: Manifest = {
    agt_version: AGT_VERSION,
    name: persona.name,
    id: randomUUID(),
    created_at: now,
    updated_at: now,
    description: '',
    ...overrides,
    // These must not be overridden — always computed
    files: fileMap as Manifest['files'],
    checksum,
  };

  // Validate manifest
  ManifestSchema.parse(manifest);
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  // 9. Generate .agt file
  const content = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  await writeFile(outputPath, content);

  return {
    outputPath,
    fileCount: Object.keys(zip.files).length,
    totalSize: content.length,
  };
}

/** Recursively add a directory to the zip */
async function addDirectoryToZip(zip: JSZip, dirPath: string, zipPath: string): Promise<void> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    const entryZipPath = `${zipPath}/${entry.name}`;
    if (entry.isDirectory()) {
      await addDirectoryToZip(zip, fullPath, entryZipPath);
    } else {
      const content = await readFile(fullPath);
      zip.file(entryZipPath, content);
    }
  }
}

/** Compute checksum for all non-manifest files in a zip */
async function computeZipChecksum(zip: JSZip): Promise<string> {
  const files: string[] = [];
  zip.forEach((path, file) => {
    if (!file.dir && path !== 'manifest.json') {
      files.push(path);
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
