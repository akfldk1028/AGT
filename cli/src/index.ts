#!/usr/bin/env node
import { Command } from 'commander';
import { runCommand } from './commands/run.js';
import { inspectCommand } from './commands/inspect.js';
import { packCommand } from './commands/pack.js';
import { unpackCommand } from './commands/unpack.js';
import { validateCommand } from './commands/validate.js';
import { chatCommand } from './commands/chat.js';

const program = new Command();

program
  .name('agt')
  .description('AGT — Agent File Format CLI')
  .version('0.1.0');

program
  .command('run <file>')
  .description('Run an agent from a .agt file')
  .option('--ollama-url <url>', 'Ollama base URL', 'http://localhost:11434')
  .option('--cloud-url <url>', 'Cloud API base URL')
  .option('--cloud-key <key>', 'Cloud API key')
  .action(runCommand);

program
  .command('chat <file>')
  .description('Interactive chat with an agent')
  .option('--ollama-url <url>', 'Ollama base URL', 'http://localhost:11434')
  .option('--cloud-url <url>', 'Cloud API base URL')
  .option('--cloud-key <key>', 'Cloud API key')
  .action(chatCommand);

program
  .command('inspect <file>')
  .description('Inspect an .agt file and show metadata')
  .option('--json', 'Output as JSON')
  .action(inspectCommand);

program
  .command('validate <file>')
  .description('Validate an .agt file against the spec')
  .action(validateCommand);

program
  .command('pack <dir>')
  .description('Package a directory into an .agt file')
  .option('-o, --output <path>', 'Output file path')
  .option('-n, --name <name>', 'Agent name')
  .option('-d, --description <desc>', 'Agent description')
  .action(packCommand);

program
  .command('unpack <file>')
  .description('Extract an .agt file to a directory')
  .option('-o, --output <dir>', 'Output directory')
  .option('--no-verify', 'Skip checksum verification')
  .action(unpackCommand);

program.parse();
