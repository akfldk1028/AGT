import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
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
import type { ValidationResult, ValidationError, ValidationWarning } from '@agt/core';

/** Validate an .agt file */
export async function validate(agtPath: string): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // 1. Read file
  let data: Buffer;
  try {
    data = await readFile(agtPath);
  } catch {
    errors.push({ path: agtPath, message: 'Cannot read file', code: 'FILE_NOT_FOUND' });
    return { valid: false, errors, warnings };
  }

  // 2. Open as zip
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    errors.push({ path: agtPath, message: 'Not a valid zip archive', code: 'INVALID_ZIP' });
    return { valid: false, errors, warnings };
  }

  // 3. Check required files
  for (const required of REQUIRED_FILES) {
    if (!zip.file(required)) {
      errors.push({ path: required, message: `Missing required file`, code: 'MISSING_FILE' });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // 4. Validate manifest
  const manifestRaw = await zip.file('manifest.json')!.async('string');
  let manifestJson: unknown;
  try {
    manifestJson = JSON.parse(manifestRaw);
  } catch {
    errors.push({ path: 'manifest.json', message: 'Invalid JSON', code: 'INVALID_JSON' });
    return { valid: false, errors, warnings };
  }

  const manifestResult = ManifestSchema.safeParse(manifestJson);
  if (!manifestResult.success) {
    for (const issue of manifestResult.error.issues) {
      errors.push({
        path: `manifest.json/${issue.path.join('.')}`,
        message: issue.message,
        code: 'SCHEMA_ERROR',
      });
    }
    return { valid: false, errors, warnings };
  }

  const manifest = manifestResult.data;

  // 5. Check version
  const [major] = manifest.agt_version.split('.').map(Number);
  const [currentMajor] = AGT_VERSION.split('.').map(Number);
  if (major > currentMajor) {
    errors.push({
      path: 'manifest.json/agt_version',
      message: `Unsupported version ${manifest.agt_version} (current: ${AGT_VERSION})`,
      code: 'VERSION_MISMATCH',
    });
  }

  // 6. Validate checksum
  const computed = await computeChecksum(zip);
  if (manifest.checksum !== computed) {
    errors.push({
      path: 'manifest.json/checksum',
      message: `Checksum mismatch: expected ${manifest.checksum}, got ${computed}`,
      code: 'CHECKSUM_MISMATCH',
    });
  }

  // 7. Validate persona.json
  await validateJsonFile(zip, 'persona.json', PersonaSchema, errors);

  // 8. Validate model-spec.json
  await validateJsonFile(zip, 'model-spec.json', ModelSpecSchema, errors);

  // 9. Validate optional files
  if (zip.file('domain.json')) {
    await validateJsonFile(zip, 'domain.json', DomainSchema, errors);
  }
  if (zip.file('mcp-config.json')) {
    await validateJsonFile(zip, 'mcp-config.json', McpConfigSchema, errors);
  }
  if (zip.file('knowledge.json')) {
    await validateJsonFile(zip, 'knowledge.json', KnowledgeGraphSchema, errors);
  }
  if (zip.file('appearance.json')) {
    await validateJsonFile(zip, 'appearance.json', AppearanceSchema, errors);
  }

  // 10. Check memory.db if present
  if (zip.file('memory.db')) {
    const memoryData = await zip.file('memory.db')!.async('nodebuffer');
    if (memoryData.length < 100) {
      warnings.push({
        path: 'memory.db',
        message: 'Memory database appears to be empty or corrupt',
        code: 'EMPTY_MEMORY',
      });
    }
    // Check SQLite magic number
    const header = memoryData.toString('ascii', 0, 16);
    if (!header.startsWith('SQLite format 3')) {
      errors.push({
        path: 'memory.db',
        message: 'Not a valid SQLite database',
        code: 'INVALID_SQLITE',
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/** Validate a JSON file against a Zod schema */
async function validateJsonFile(
  zip: JSZip,
  fileName: string,
  schema: { safeParse: (data: unknown) => { success: boolean; error?: { issues: Array<{ path: (string | number)[]; message: string }> } } },
  errors: ValidationError[],
): Promise<void> {
  const raw = await zip.file(fileName)!.async('string');
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    errors.push({ path: fileName, message: 'Invalid JSON', code: 'INVALID_JSON' });
    return;
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    for (const issue of result.error!.issues) {
      errors.push({
        path: `${fileName}/${issue.path.join('.')}`,
        message: issue.message,
        code: 'SCHEMA_ERROR',
      });
    }
  }
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
