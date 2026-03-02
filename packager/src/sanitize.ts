import { readFile, writeFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { ManifestSchema } from '@agt/core';
import { computeChecksum } from './validate.js';

// Common PII pattern sources (without /g flag — created fresh each use)
const PII_PATTERN_DEFS = [
  { name: 'email', source: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}' },
  { name: 'phone_kr', source: '01[0-9]-?\\d{3,4}-?\\d{4}' },
  { name: 'phone_intl', source: '\\+?\\d{1,3}[-.\\s]?\\(?\\d{1,4}\\)?[-.\\s]?\\d{1,4}[-.\\s]?\\d{1,9}' },
  { name: 'ip_address', source: '\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b' },
  { name: 'korean_rrn', source: '\\d{6}-?[1-4]\\d{6}' },
] as const;

export interface SanitizeOptions {
  /** Path to input .agt file */
  inputPath: string;
  /** Path to output .agt file */
  outputPath: string;
  /** Additional patterns to detect/remove */
  extraPatterns?: Array<{ name: string; pattern: RegExp }>;
  /** Replacement string for detected PII */
  replacement?: string;
}

export interface SanitizeResult {
  outputPath: string;
  detections: Array<{ file: string; type: string; count: number }>;
  totalRemoved: number;
}

/** Sanitize an .agt file by removing PII from text content */
export async function sanitize(options: SanitizeOptions): Promise<SanitizeResult> {
  const { inputPath, outputPath, extraPatterns, replacement = '[REDACTED]' } = options;

  const data = await readFile(inputPath);
  const zip = await JSZip.loadAsync(data);

  const allPatterns = [
    ...PII_PATTERN_DEFS.map(p => ({ name: p.name, source: p.source })),
    ...(extraPatterns ?? []).map(p => ({ name: p.name, source: p.pattern.source })),
  ];
  const detections: SanitizeResult['detections'] = [];
  let totalRemoved = 0;

  // Process JSON files
  const jsonFiles = ['persona.json', 'knowledge.json', 'domain.json', 'mcp-config.json'];
  for (const fileName of jsonFiles) {
    const file = zip.file(fileName);
    if (!file) continue;

    let content = await file.async('string');
    let fileTotal = 0;

    for (const { name, source } of allPatterns) {
      // Create fresh regex each time to avoid stateful /g lastIndex issues
      const matchRegex = new RegExp(source, 'g');
      const matches = content.match(matchRegex);
      if (matches && matches.length > 0) {
        detections.push({ file: fileName, type: name, count: matches.length });
        fileTotal += matches.length;
        content = content.replace(new RegExp(source, 'g'), replacement);
      }
    }

    if (fileTotal > 0) {
      zip.file(fileName, content);
      totalRemoved += fileTotal;
    }
  }

  // Note: memory.db sanitization would require sqlite operations
  // For now, we flag it but don't modify the binary
  if (zip.file('memory.db')) {
    detections.push({
      file: 'memory.db',
      type: 'warning',
      count: 0,
    });
  }

  // Recompute checksum
  const newChecksum = await computeChecksum(zip);

  // Update manifest with new checksum
  const manifestRaw = await zip.file('manifest.json')!.async('string');
  const manifest = ManifestSchema.parse(JSON.parse(manifestRaw));
  manifest.checksum = newChecksum;
  manifest.updated_at = new Date().toISOString();
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  // Write output
  const output = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  await writeFile(outputPath, output);

  return { outputPath, detections, totalRemoved };
}
