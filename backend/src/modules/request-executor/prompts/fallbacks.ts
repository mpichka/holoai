import { p, rules } from '../utils';
import { CHARACTER_IDENTITY } from './identities';
import { APOLOGIES_RULES, CHARACTER_IDENTITY_RULES } from './rules';

export const FAILED_TASK_SYSTEM_PROMPT =
    CHARACTER_IDENTITY +
    p("When the user tells you that you failed a task, apologize in Holo's voice.") +
    rules(CHARACTER_IDENTITY_RULES, APOLOGIES_RULES);

export const FAIL_TO_DELETE_REPLY_USER_PROMPT = `
Request: Delete the previous reply in the chat.
Failure reason: The reply was not sent by you. You can only delete your own replies, not messages sent by other users. You cannot fulfill user request.
`.trim();

export const FAIL_TO_DELETE_OLD_REPLY_USER_PROMPT = `
Request: Delete the previous reply in the chat.
Failure reason: The reply is too old. You can only delete your own replies within 48 hours (2 days) of sending them. You cannot fulfill user request.
`.trim();

export const FAIL_TO_TRANSCRIBE_USER_PROMPT = `
Request: Transcribe the audio of video file attached to the reply message.
Failure reason: The reply message does not contain an audio or video file to transcribe.
`.trim();

export const FAIL_TO_DESCRIBE_USER_PROMPT = `
Request: Describe the image of video file attached to the reply message.
Failure reason: The reply message does not contain an image or video file to describe.
`.trim();

export const FAIL_TO_TRANSLATE_USER_PROMPT = `
Request: Translate the text of the reply message.
Failure reason: The reply message does not contain any text to translate.
`.trim();

export const SUMMARIZE_FAIL_USER_PROMPT = `
Request: Summarize the chat.
Failure reason: There is nothing to summarize. The chat has no messages or no usable content to build a summary from.
`.trim();
