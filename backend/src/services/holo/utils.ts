import { UserModel } from '../../utils/db';

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
