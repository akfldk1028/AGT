import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import chalk from 'chalk';
import JSZip from 'jszip';
import { ManifestSchema, PersonaSchema } from '@agt/core';

interface InspectOptions {
  json?: boolean;
}

export async function inspectCommand(file: string, options: InspectOptions): Promise<void> {
  const filePath = resolve(file);

  try {
    const data = await readFile(filePath);
    const zip = await JSZip.loadAsync(data);

    // Read manifest
    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) {
      console.error(chalk.red('Invalid .agt file: missing manifest.json'));
      process.exit(1);
    }

    const manifestRaw = await manifestFile.async('string');
    const manifest = ManifestSchema.parse(JSON.parse(manifestRaw));

    // Read persona
    const personaFile = zip.file('persona.json');
    let personaName = '';
    let personaRole = '';
    if (personaFile) {
      const personaRaw = await personaFile.async('string');
      const persona = PersonaSchema.parse(JSON.parse(personaRaw));
      personaName = persona.name;
      personaRole = persona.role ?? '';
    }

    // Collect file sizes
    const files: Array<{ name: string; size: number }> = [];
    for (const [name, entry] of Object.entries(zip.files)) {
      if (!entry.dir) {
        const content = await entry.async('nodebuffer');
        files.push({ name, size: content.length });
      }
    }

    if (options.json) {
      console.log(JSON.stringify({ manifest, files }, null, 2));
      return;
    }

    // Pretty print
    console.log();
    console.log(chalk.bold.white(`  ${manifest.name}`));
    if (personaRole) console.log(chalk.dim(`  ${personaRole}`));
    console.log();

    console.log(chalk.dim('  ─────────────────────────────────'));
    console.log(`  ${chalk.gray('ID:')}          ${manifest.id}`);
    console.log(`  ${chalk.gray('Version:')}     ${manifest.agt_version}`);
    console.log(`  ${chalk.gray('Created:')}     ${manifest.created_at}`);
    console.log(`  ${chalk.gray('Updated:')}     ${manifest.updated_at}`);
    if (manifest.author?.name) {
      console.log(`  ${chalk.gray('Author:')}      ${manifest.author.name}`);
    }
    if (manifest.license) {
      console.log(`  ${chalk.gray('License:')}     ${manifest.license}`);
    }
    console.log();

    if (manifest.description) {
      console.log(`  ${chalk.gray('Description:')}`);
      console.log(`  ${manifest.description}`);
      console.log();
    }

    if (manifest.tags && manifest.tags.length > 0) {
      console.log(`  ${chalk.gray('Tags:')} ${manifest.tags.map(t => chalk.cyan(`#${t}`)).join(' ')}`);
      console.log();
    }

    if (manifest.stats) {
      console.log(chalk.dim('  Stats'));
      console.log(`  ${chalk.gray('Conversations:')} ${manifest.stats.total_conversations}`);
      console.log(`  ${chalk.gray('Memory entries:')} ${manifest.stats.memory_entries}`);
      console.log(`  ${chalk.gray('Knowledge nodes:')} ${manifest.stats.knowledge_nodes}`);
      console.log();
    }

    console.log(chalk.dim('  Files'));
    for (const f of files) {
      const size = formatSize(f.size);
      console.log(`  ${chalk.white(f.name.padEnd(25))} ${chalk.dim(size)}`);
    }

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    console.log(chalk.dim(`  ─────────────────────────────────`));
    console.log(`  ${chalk.gray('Total:')} ${files.length} files, ${formatSize(totalSize)}`);
    console.log();

  } catch (err) {
    console.error(chalk.red(`Failed to inspect: ${err instanceof Error ? err.message : err}`));
    process.exit(1);
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
