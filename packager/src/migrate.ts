import { readFile, writeFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { AGT_VERSION, ManifestSchema } from '@agt/core';
import type { Manifest } from '@agt/core';
import { computeChecksum } from './validate.js';

export interface MigrateOptions {
  /** Path to input .agt file */
  inputPath: string;
  /** Path to output .agt file (can be same as input) */
  outputPath: string;
  /** Target version (defaults to current AGT_VERSION) */
  targetVersion?: string;
}

export interface MigrateResult {
  outputPath: string;
  fromVersion: string;
  toVersion: string;
  migrations: string[];
}

type MigrationFn = (zip: JSZip, manifest: Manifest) => Promise<Manifest>;

/** Registry of version migrations */
const MIGRATIONS: Map<string, MigrationFn> = new Map([
  // Example: v1.0.0 → v1.1.0
  // ['1.0.0→1.1.0', async (zip, manifest) => {
  //   // Add new optional fields, transform data, etc.
  //   return { ...manifest, agt_version: '1.1.0' };
  // }],
]);

/** Migrate an .agt file to the target version */
export async function migrate(options: MigrateOptions): Promise<MigrateResult> {
  const { inputPath, outputPath, targetVersion = AGT_VERSION } = options;

  const data = await readFile(inputPath);
  const zip = await JSZip.loadAsync(data);

  const manifestRaw = await zip.file('manifest.json')!.async('string');
  let manifest = ManifestSchema.parse(JSON.parse(manifestRaw));

  const fromVersion = manifest.agt_version;
  const appliedMigrations: string[] = [];

  // Apply migrations in order
  let currentVersion = fromVersion;
  while (currentVersion !== targetVersion) {
    const migrationKey = `${currentVersion}→${targetVersion}`;
    const migration = MIGRATIONS.get(migrationKey);

    if (!migration) {
      // Try step-by-step migrations
      let found = false;
      for (const [key, fn] of MIGRATIONS) {
        if (key.startsWith(`${currentVersion}→`)) {
          manifest = await fn(zip, manifest);
          currentVersion = manifest.agt_version;
          appliedMigrations.push(key);
          found = true;
          break;
        }
      }

      if (!found) {
        if (currentVersion === fromVersion) {
          // No migration needed or already at target
          manifest.agt_version = targetVersion;
          break;
        }
        throw new Error(`No migration path from ${currentVersion} to ${targetVersion}`);
      }
    } else {
      manifest = await migration(zip, manifest);
      currentVersion = manifest.agt_version;
      appliedMigrations.push(migrationKey);
    }
  }

  // Recompute checksum
  manifest.checksum = await computeChecksum(zip);
  manifest.updated_at = new Date().toISOString();
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  // Write output
  const output = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  await writeFile(outputPath, output);

  return {
    outputPath,
    fromVersion,
    toVersion: manifest.agt_version,
    migrations: appliedMigrations,
  };
}
