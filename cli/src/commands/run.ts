import { resolve } from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { AgentRuntime } from '@agt/runtime';

interface RunOptions {
  ollamaUrl: string;
  cloudUrl?: string;
  cloudKey?: string;
}

export async function runCommand(file: string, options: RunOptions): Promise<void> {
  const filePath = resolve(file);
  const spinner = ora('Loading agent...').start();

  try {
    const runtime = new AgentRuntime({
      filePath,
      ollamaBaseUrl: options.ollamaUrl,
      cloudBaseUrl: options.cloudUrl,
      cloudApiKey: options.cloudKey,
    });

    const info = await runtime.start();
    spinner.succeed(`Agent loaded: ${chalk.bold(info.name)}`);

    console.log(chalk.dim(`  Provider: ${info.llmProvider} (${info.llmModel})`));
    console.log(chalk.dim(`  Memory: ${info.memoryCount} entries`));
    console.log(chalk.dim(`  Tools: ${info.toolCount}`));
    console.log(chalk.dim(`  Description: ${info.description}`));
    console.log();
    console.log(chalk.green('Agent is ready. Type your message (Ctrl+C to exit):'));
    console.log();

    // Simple REPL
    const readline = await import('node:readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const prompt = (): void => {
      rl.question(chalk.blue('You: '), async (input) => {
        if (!input.trim()) {
          prompt();
          return;
        }

        try {
          const response = await runtime.chat(input);
          console.log(chalk.yellow(`${info.name}: `) + response);
          console.log();
        } catch (err) {
          console.error(chalk.red(`Error: ${err instanceof Error ? err.message : err}`));
        }

        prompt();
      });
    };

    // Graceful shutdown — save memory before exit
    const shutdown = async () => {
      console.log(chalk.dim('\nSaving agent state...'));
      await runtime.stop();
      console.log(chalk.dim('Agent saved. Goodbye!'));
      process.exit(0);
    };

    rl.on('close', shutdown);
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    prompt();
  } catch (err) {
    spinner.fail(`Failed to load agent: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}
