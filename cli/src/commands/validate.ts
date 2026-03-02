import { resolve } from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { validate } from '@agt/packager';

export async function validateCommand(file: string): Promise<void> {
  const filePath = resolve(file);
  const spinner = ora('Validating...').start();

  try {
    const result = await validate(filePath);

    if (result.valid) {
      spinner.succeed(chalk.green('Valid .agt file'));

      if (result.warnings.length > 0) {
        console.log();
        console.log(chalk.yellow(`  ${result.warnings.length} warning(s):`));
        for (const w of result.warnings) {
          console.log(chalk.yellow(`    ⚠ [${w.code}] ${w.path}: ${w.message}`));
        }
      }
    } else {
      spinner.fail(chalk.red('Invalid .agt file'));
      console.log();
      console.log(chalk.red(`  ${result.errors.length} error(s):`));
      for (const e of result.errors) {
        console.log(chalk.red(`    ✗ [${e.code}] ${e.path}: ${e.message}`));
      }

      if (result.warnings.length > 0) {
        console.log();
        console.log(chalk.yellow(`  ${result.warnings.length} warning(s):`));
        for (const w of result.warnings) {
          console.log(chalk.yellow(`    ⚠ [${w.code}] ${w.path}: ${w.message}`));
        }
      }

      process.exit(1);
    }
  } catch (err) {
    spinner.fail(`Validation failed: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}
