export const COMMAND = Object.freeze({
    SUMMARIZE: 'summarize',
    TRANSCRIBE: 'transcribe',
    TRANSLATE: 'translate',
    DESCRIBE: 'describe',
    DELETE: 'delete',
});

export const COMMANDS = Object.values(COMMAND);

export type CommandTypes = (typeof COMMAND)[keyof typeof COMMAND];
