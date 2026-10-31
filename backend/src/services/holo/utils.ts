export const rules = (...args: string[]) => 'RULES:\n' + args.join('\n');

export const p = (text: string) => `\n\n${text}\n\n`;

export const fillTemplate = (template: string, values: Record<string, string>) =>
    template.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);
