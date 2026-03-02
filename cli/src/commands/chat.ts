import { resolve } from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { AgentRuntime } from '@agt/runtime';

interface ChatOptions {
  ollamaUrl: string;
  cloudUrl?: string;
  cloudKey?: string;
}

export async function chatCommand(file: string, options: ChatOptions): Promise<void> {
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

    console.log();
    console.log(chalk.dim('  ╭─────────────────────────────────────╮'));
    console.log(chalk.dim('  │') + chalk.bold.white(` ${info.name}`.padEnd(38)) + chalk.dim('│'));
    console.log(chalk.dim('  │') + chalk.dim(` ${info.llmProvider}/${info.llmModel}`.padEnd(38)) + chalk.dim('│'));
    console.log(chalk.dim('  │') + chalk.dim(` ${info.memoryCount} memories, ${info.toolCount} tools`.padEnd(38)) + chalk.dim('│'));
    console.log(chalk.dim('  ╰─────────────────────────────────────╯'));
    console.log();
    console.log(chalk.dim('  Type /quit to exit, /clear to reset history'));
    console.log();

    const readline = await import('node:readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const prompt = (): void => {
      rl.question(chalk.blue('> '), async (input) => {
        const trimmed = input.trim();

        if (!trimmed) {
          prompt();
          return;
        }

        // Handle commands
        if (trimmed === '/quit' || trimmed === '/exit') {
          console.log(chalk.dim('Goodbye!'));
          await runtime.stop();
          rl.close();
          process.exit(0);
        }

        if (trimmed === '/clear') {
          runtime.clearHistory();
          console.log(chalk.dim('History cleared.'));
          prompt();
          return;
        }

        if (trimmed === '/info') {
          console.log(chalk.dim(`  Name: ${info.name}`));
          console.log(chalk.dim(`  Model: ${info.llmProvider}/${info.llmModel}`));
          console.log(chalk.dim(`  Memory: ${info.memoryCount} entries`));
          console.log(chalk.dim(`  Tools: ${info.toolCount}`));
          prompt();
          return;
        }

        // Send message
        const thinkingSpinner = ora({ text: 'Thinking...', indent: 2 }).start();

        try {
          const response = await runtime.chat(trimmed);
          thinkingSpinner.stop();
          console.log();
          console.log(chalk.yellow(`  ${info.name}:`));
          console.log(`  ${response}`);
          console.log();
        } catch (err) {
          thinkingSpinner.fail(`Error: ${err instanceof Error ? err.message : err}`);
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
    spinner.fail(`Failed: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}
