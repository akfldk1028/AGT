import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import JSZip from 'jszip';
import { ManifestSchema } from '@agt/core';
import type { Manifest } from '@agt/core';
import { computeChecksum } from './validate.js';

export interface UnpackOptions {
  /** Path to .agt file */
  agtPath: string;
  /** Output directory */
  outputDir: string;
  /** Skip checksum verification */
  skipVerify?: boolean;
}

export interface UnpackResult {
  outputDir: string;
  manifest: Manifest;
  fileCount: number;
}

/** Unpack an .agt file into a directory */
export async function unpack(options: UnpackOptions): Promise<UnpackResult> {
  const { agtPath, outputDir, skipVerify } = options;

  // 1. Read the .agt file
  const data = await readFile(agtPath);

  // 2. Open as zip
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw new Error('Invalid .agt file: not a valid zip archive');
  }

  // 3. Read and validate manifest
  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) {
    throw new Error('Invalid .agt file: missing manifest.json');
  }

  const manifestRaw = await manifestFile.async('string');
  const manifest = ManifestSchema.parse(JSON.parse(manifestRaw));

  // 4. Verify checksum
  if (!skipVerify) {
    const computed = await computeChecksum(zip);
    if (manifest.checksum !== computed) {
      throw new Error(
        `Checksum mismatch: expected ${manifest.checksum}, got ${computed}`
      );
    }
  }

  // 5. Extract all files
  await mkdir(outputDir, { recursive: true });
  let fileCount = 0;

  for (const [relativePath, file] of Object.entries(zip.files)) {
    const targetPath = join(outputDir, relativePath);
    if (file.dir) {
      await mkdir(targetPath, { recursive: true });
      continue;
    }

    await mkdir(dirname(targetPath), { recursive: true });
    const content = await file.async('nodebuffer');
    await writeFile(targetPath, content);
    fileCount++;
  }

  return { outputDir, manifest, fileCount };
}
