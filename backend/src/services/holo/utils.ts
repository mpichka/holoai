export const rules = (...args: string[]) => 'RULES:\n' + args.join('\n');

export const p = (text: string) => `\n\n${text}\n\n`;
