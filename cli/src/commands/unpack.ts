import { resolve, basename } from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { unpack } from '@agt/packager';

interface UnpackCommandOptions {
  output?: string;
  verify?: boolean;
}

export async function unpackCommand(file: string, options: UnpackCommandOptions): Promise<void> {
  const agtPath = resolve(file);
  const outputDir = options.output
    ? resolve(options.output)
    : resolve(basename(file, '.agt'));

  const spinner = ora('Unpacking agent...').start();

  try {
    const result = await unpack({
      agtPath,
      outputDir,
      skipVerify: options.verify === false,
    });

    spinner.succeed(`Unpacked to ${chalk.bold(result.outputDir)}`);
    console.log(chalk.dim(`  Agent: ${result.manifest.name}`));
    console.log(chalk.dim(`  Files: ${result.fileCount}`));
    console.log(chalk.dim(`  Version: ${result.manifest.agt_version}`));
  } catch (err) {
    spinner.fail(`Failed to unpack: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}
