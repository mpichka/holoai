import type { TriggerReason } from './constants';

export interface Trigger<C = never> {
    reason: TriggerReason;
    command?: C;
    // Text following the command, e.g. "/summarize@bot last hour" -> "last hour".
    // Empty for the other reasons, where the whole message is the request.
    args?: string;
}
