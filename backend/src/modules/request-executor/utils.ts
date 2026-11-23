import { UserModel } from '../../shared/database';
import { TELEGRAM_MESSAGE_TEXT_LIMIT } from './constants';

export const rules = (...args: string[]) => 'RULES:\n' + args.join('\n');

export const p = (text: string) => `\n\n${text}\n\n`;

export const fillTemplate = (template: string, values: Record<string, string>) =>
    template.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);

export const formatUserName = (user: UserModel): string => {
    const { firstName, lastName, userName, spelledName } = user;

    if (spelledName?.trim()) return spelledName.trim();
    if (firstName?.trim()) return `${firstName} ${lastName || ''}`.trim();
    if (userName) return userName;

    return 'невідомцю';
};

export const formatGender = (user: UserModel): string => {
    if (!user.gender) return 'unknown';
    return user.gender;
};

export const formatEstimatedDuration = (seconds: number): string => {
    const total = Math.ceil(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;

    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
};

export const chunk = <T>(arr: T[], size: number): T[][] => {
    const result: T[][] = [];

    for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
    }

    return result;
};

const fitsMessage = (text: string) => text.length <= TELEGRAM_MESSAGE_TEXT_LIMIT;

const splitOversizedParagraph = (paragraph: string): string[] => {
    const fragments: string[] = [];
    let fragment = '';

    for (const word of paragraph.split(/\s+/)) {
        const candidate = fragment ? `${fragment} ${word}` : word;

        if (fitsMessage(candidate)) {
            fragment = candidate;
            continue;
        }

        if (fragment) fragments.push(fragment);

        fragment = word;

        if (fitsMessage(fragment)) continue;

        const chars = Array.from(fragment);

        fragment = '';

        for (const char of chars) {
            const charCandidate = fragment + char;

            if (!fitsMessage(charCandidate) && fragment) {
                fragments.push(fragment);
                fragment = char;
            } else {
                fragment = charCandidate;
            }
        }

        if (fragment) fragments.push(fragment);

        fragment = '';
    }

    if (fragment) fragments.push(fragment);

    return fragments;
};

/** Splits text into fragments that fit into a single Telegram message, preferring paragraph boundaries. */
export const splitIntoMessageFragments = (text: string): string[] => {
    const paragraphs = text
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);
    const messages: string[] = [];
    let current = '';

    if (!paragraphs.length) return [text.trim()];

    for (const paragraph of paragraphs) {
        const candidate = current ? `${current}\n\n${paragraph}` : paragraph;

        if (fitsMessage(candidate)) {
            current = candidate;
            continue;
        }

        if (current) {
            messages.push(current);
            current = '';
        }

        if (fitsMessage(paragraph)) {
            current = paragraph;
        } else {
            messages.push(...splitOversizedParagraph(paragraph));
        }
    }

    if (current) messages.push(current);

    return messages;
};
