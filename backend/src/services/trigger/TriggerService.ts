import { TRIGGER } from './constants';
import type { Trigger } from './types';

export class TriggerService {
    matchMention(text?: string, botName?: string): Trigger | null {
        if (!text || !botName) return null;

        const escaped = botName.replace(/[^\w]/g, '\\$&');
        const regex = new RegExp(`(?<!\\w)@${escaped}(?!\\w)`, 'i');
        return regex.test(text) ? { reason: TRIGGER.MENTION } : null;
    }

    matchCharacterName(text?: string, characterNames: string[] = []): Trigger | null {
        if (!text || !characterNames.length) return null;

        const alternation = characterNames.join('|');
        const regex = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${alternation})(?![\\p{L}\\p{N}_])`, 'iu');
        return regex.test(text) ? { reason: TRIGGER.NAME } : null;
    }

    matchCommand(text?: string, botName?: string, commands: string[] = []): Trigger | null {
        if (!text || !botName || !commands.length) return null;

        const escaped = botName.replace(/[^\w]/g, '\\$&');
        const leadingMention = escaped ? `(?:@${escaped}\\s+)?` : '';
        const regex = new RegExp(`^\\s*${leadingMention}/(\\w+)(?:@(\\w+))?(?:\\s+([\\s\\S]*))?$`, 'i');

        const match = regex.exec(text);
        if (!match) return null;

        const [, name, target, args = ''] = match;
        const command = commands.find((command) => command === name.toLowerCase());
        if (!command) return null;

        // "/cmd@someone_else" is not for us; "/cmd@us" and bare "/cmd" are.
        if (target && target.toLowerCase() !== botName?.toLowerCase()) return null;

        return { reason: TRIGGER.COMMAND, command, args: args.trim() };
    }
}
