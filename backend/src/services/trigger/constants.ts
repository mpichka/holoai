export const TRIGGER = Object.freeze({
    COMMAND: 'command',
    MENTION: 'mention',
    NAME: 'name',
});

export type TriggerReason = (typeof TRIGGER)[keyof typeof TRIGGER];
