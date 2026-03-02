/**
 * Build example .agt files from source directories.
 *
 * Usage: npx tsx scripts/build-examples.ts
 *
 * This generates zip archives (.agt files) from the spec/examples/*-src/ directories.
 * It can run standalone without the full monorepo build since it uses JSZip directly.
 */

import { readFile, readdir, stat, writeFile, mkdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

// Inline JSZip usage — if not installed yet, use the built-in approach
async function buildAgt(sourceDir: string, outputPath: string): Promise<void> {
  // Dynamic import for JSZip
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  // Read all files from source directory
  const files = await readdir(sourceDir, { recursive: true });
  const fileEntries: Array<{ path: string; content: Buffer }> = [];

  for (const file of files) {
    const fullPath = join(sourceDir, file as string);
    const fileStat = await stat(fullPath);
    if (fileStat.isFile()) {
      const content = await readFile(fullPath);
      zip.file(file as string, content);
      fileEntries.push({ path: file as string, content });
    }
  }

  // Compute checksum (all files except manifest.json)
  const nonManifestFiles = fileEntries
    .filter(f => f.path !== 'manifest.json')
    .sort((a, b) => a.path.localeCompare(b.path));

  const hashes = nonManifestFiles.map(f =>
    createHash('sha256').update(f.content).digest('hex')
  );
  const checksum = `sha256:${createHash('sha256').update(hashes.join('')).digest('hex')}`;

  // Read persona for name
  const personaRaw = await readFile(join(sourceDir, 'persona.json'), 'utf-8');
  const persona = JSON.parse(personaRaw);

  // Build manifest
  const now = new Date().toISOString();
  const manifest = {
    agt_version: '1.0.0',
    name: persona.name || basename(sourceDir).replace('-src', ''),
    id: randomUUID(),
    created_at: now,
    updated_at: now,
    description: `Example ${basename(sourceDir).replace('-src', '')} agent`,
    tags: ['example'],
    stats: { total_conversations: 0, memory_entries: 0, knowledge_nodes: 0 },
    files: {
      persona: 'persona.json',
      model_spec: 'model-spec.json',
      ...(fileEntries.some(f => f.path === 'domain.json') ? { domain: 'domain.json' } : {}),
      ...(fileEntries.some(f => f.path === 'knowledge.json') ? { knowledge: 'knowledge.json' } : {}),
      ...(fileEntries.some(f => f.path === 'mcp-config.json') ? { mcp_config: 'mcp-config.json' } : {}),
    },
    checksum,
    license: 'MIT',
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  // Write .agt file
  const content = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  await writeFile(outputPath, content);

  console.log(`  Built: ${outputPath} (${(content.length / 1024).toFixed(1)} KB, ${fileEntries.length + 1} files)`);
}

async function main(): Promise<void> {
  const examplesDir = join(import.meta.dirname ?? '.', '..', 'spec', 'examples');

  const sourceDirs = [
    { src: 'minimal-src', out: 'minimal.agt' },
    { src: 'medical-debate-src', out: 'medical-debate.agt' },
    { src: 'book-critic-src', out: 'book-critic.agt' },
  ];

  console.log('Building example .agt files...\n');

  for (const { src, out } of sourceDirs) {
    const sourceDir = join(examplesDir, src);
    const outputPath = join(examplesDir, out);
    await buildAgt(sourceDir, outputPath);
  }

  console.log('\nDone!');
}

main().catch(console.error);
