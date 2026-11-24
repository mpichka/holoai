export const COMMAND = Object.freeze({
    SUMMARIZE: 'h-sum',
    TRANSCRIBE: 'h-audio',
    TRANSLATE: 'h-trans',
    DESCRIBE: 'h-desc',
    DELETE: 'h-del',
});

export const COMMANDS = Object.values(COMMAND);

export type CommandTypes = (typeof COMMAND)[keyof typeof COMMAND];
