export const TRIGGER = Object.freeze({
    COMMAND: 'command',
    MENTION: 'mention',
    NAME: 'name',
    REPLY: 'reply',
});

export type TriggerReason = (typeof TRIGGER)[keyof typeof TRIGGER];

export interface Trigger {
    reason: TriggerReason;
    command?: string;
    // Text following the command, e.g. "/summarize@bot last hour" -> "last hour".
    // Empty for the other reasons, where the whole message is the request.
    args?: string;
}
