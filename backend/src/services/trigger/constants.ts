export const TRIGGER = Object.freeze({
    COMMAND: 'command',
    MENTION: 'mention',
    NAME: 'name',
    REPLY: 'reply',
});

export type TriggerReason = (typeof TRIGGER)[keyof typeof TRIGGER];
