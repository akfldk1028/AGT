import { resolve, basename } from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { pack } from '@agt/packager';

interface PackCommandOptions {
  output?: string;
  name?: string;
  description?: string;
}

export async function packCommand(dir: string, options: PackCommandOptions): Promise<void> {
  const sourceDir = resolve(dir);
  const outputPath = options.output
    ? resolve(options.output)
    : resolve(`${basename(sourceDir)}.agt`);

  const spinner = ora('Packing agent...').start();

  try {
    const result = await pack({
      sourceDir,
      outputPath,
      overrides: {
        ...(options.name ? { name: options.name } : {}),
        ...(options.description ? { description: options.description } : {}),
      } as Record<string, string>,
    });

    spinner.succeed(`Packed ${result.fileCount} files into ${chalk.bold(result.outputPath)}`);
    console.log(chalk.dim(`  Size: ${formatSize(result.totalSize)}`));
  } catch (err) {
    spinner.fail(`Failed to pack: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
