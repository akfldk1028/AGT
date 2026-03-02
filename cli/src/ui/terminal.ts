import chalk from 'chalk';

/** Format a box with text content */
export function box(title: string, lines: string[]): string {
  const maxLen = Math.max(title.length, ...lines.map(l => stripAnsi(l).length));
  const width = maxLen + 4;
  const hr = '─'.repeat(width - 2);

  const output: string[] = [];
  output.push(chalk.dim(`╭${hr}╮`));
  output.push(chalk.dim('│') + chalk.bold(` ${title}`.padEnd(width - 1)) + chalk.dim('│'));
  output.push(chalk.dim(`├${hr}┤`));

  for (const line of lines) {
    const padding = width - 2 - stripAnsi(line).length;
    output.push(chalk.dim('│') + ` ${line}${' '.repeat(Math.max(0, padding - 1))}` + chalk.dim('│'));
  }

  output.push(chalk.dim(`╰${hr}╯`));
  return output.join('\n');
}

/** Format key-value pairs */
export function kvPairs(pairs: Array<[string, string]>): string[] {
  const maxKeyLen = Math.max(...pairs.map(([k]) => k.length));
  return pairs.map(([key, value]) =>
    `${chalk.gray(key.padEnd(maxKeyLen))}  ${value}`
  );
}

/** Format a section header */
export function sectionHeader(title: string): string {
  return chalk.dim(`── ${chalk.white(title)} ${'─'.repeat(Math.max(0, 30 - title.length))}`);
}

/** Strip ANSI escape codes from a string */
function stripAnsi(str: string): string {
  return str.replace(/\u001b\[\d+m/g, '');
}
