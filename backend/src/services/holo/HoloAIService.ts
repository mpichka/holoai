import { DateTime } from 'luxon';
import type winston from 'winston';
import { COMMAND, CommandTypes } from '../../constants';
import { toScopeEpoch } from '../../utils/datetime';
import type { Container } from '../../utils/di';
import { Llama } from '../../utils/llama';
import { DEFAULT_MESSAGES_SUMMARIZE_COUNT } from './constants';
import {
    DESCRIBE_MEDIA_FILE_USER_PROMPT,
    FAIL_TO_DELETE_OLD_REPLY_USER_PROMPT,
    FAIL_TO_DELETE_REPLY_USER_PROMPT,
    FAIL_TO_DESCRIBE_USER_PROMPT,
    FAIL_TO_TRANSCRIBE_USER_PROMPT,
    FAILED_TASK_SYSTEM_PROMPT,
    MESSAGE_CLASSIFIER_IDENTITY,
    MESSAGE_SUMMARIZER_IDENTITY,
    MESSAGE_SUMMARIZER_SCOPE_IDENTITY,
    REJECT_OVERRIDE_SYSTEM_PROMPT,
    REJECT_OVERRIDE_USER_PROMPT,
    REJECT_UNACCEPTABLE_SYSTEM_PROMPT,
    REJECT_UNACCEPTABLE_USER_PROMPT,
    SUMMARIZE_CHAT_USER_PROMPT,
    SUMMARIZE_FAIL_USER_PROMPT,
    SUMMARIZE_MESSAGES_SYSTEM_PROMPT,
    SUMMARIZE_PROGRESS_SYSTEM_PROMPT,
    TASK_ACKNOWLEDGED_SYSTEM_PROMPT,
    TASK_TEMPLATE_SYSTEM_PROMPT,
    TRANSCRIBE_MEDIA_FILE_USER_PROMPT,
    TRANSLATE_DESCRIPTION_SYSTEM_PROMPT,
} from './prompts';
import { type ChatSummaryMetadata, type Command, type SummarizeScope } from './types';
import { formatEstimatedDuration, p } from './utils';

export class HoloAIService {
    // Multimodal, for quick analysis
    llamaM: Llama;
    // Text-rich, for nice message
    llamaT: Llama;
    logger: winston.Logger;

    constructor(container: Container) {
        this.llamaM = container.LlamaM;
        this.llamaT = container.LlamaT;
        this.logger = container.LoggerFactory.createLogger('HoloAI');
    }

    async defineCommand(message?: string): Promise<Command[]> {
        if (!message) return [];

        const res = await this.llamaM.request([
            {
                role: 'system',
                content: MESSAGE_CLASSIFIER_IDENTITY,
            },
            {
                role: 'user',
                content: message,
            },
        ]);

        const data = Llama.toResponse(res);

        return data ? JSON.parse(data) : [];
    }

    async taskAcknowledge(task: CommandTypes): Promise<string> {
        let userPrompt = "User doesn't specify own request.";

        switch (task) {
            case COMMAND.TRANSCRIBE: {
                userPrompt = TRANSCRIBE_MEDIA_FILE_USER_PROMPT;
                break;
            }
            case COMMAND.DESCRIBE: {
                userPrompt = DESCRIBE_MEDIA_FILE_USER_PROMPT;
                break;
            }
            case COMMAND.SUMMARIZE: {
                userPrompt = SUMMARIZE_CHAT_USER_PROMPT;
                break;
            }
        }

        const res = await this.llamaT.request(
            [
                {
                    role: 'system',
                    content: TASK_ACKNOWLEDGED_SYSTEM_PROMPT,
                },
                {
                    role: 'user',
                    content: userPrompt,
                },
            ],
            'low',
        );

        return Llama.toResponse(res);
    }

    async taskFail(task: CommandTypes): Promise<string> {
        let userPrompt = "User doesn't specify own request.";

        switch (task) {
            case COMMAND.TRANSCRIBE: {
                userPrompt = FAIL_TO_TRANSCRIBE_USER_PROMPT;
                break;
            }
            case COMMAND.DESCRIBE: {
                userPrompt = FAIL_TO_DESCRIBE_USER_PROMPT;
                break;
            }
            case COMMAND.SUMMARIZE: {
                userPrompt = SUMMARIZE_FAIL_USER_PROMPT;
                break;
            }
        }

        const res = await this.llamaT.request(
            [
                {
                    role: 'system',
                    content: FAILED_TASK_SYSTEM_PROMPT,
                },
                {
                    role: 'user',
                    content: userPrompt,
                },
            ],
            'low',
        );

        return Llama.toResponse(res);
    }

    async failToDeleteReply(old = false): Promise<string> {
        const userPrompt = old ? FAIL_TO_DELETE_OLD_REPLY_USER_PROMPT : FAIL_TO_DELETE_REPLY_USER_PROMPT;

        const res = await this.llamaT.request(
            [
                {
                    role: 'system',
                    content: FAILED_TASK_SYSTEM_PROMPT,
                },
                {
                    role: 'user',
                    content: userPrompt,
                },
            ],
            'low',
        );

        return Llama.toResponse(res);
    }

    async generateTemplateResponse(task: CommandTypes): Promise<string> {
        let userPrompt = 'Write the template for the following task.\n';
        switch (task) {
            case COMMAND.TRANSCRIBE: {
                userPrompt += TRANSCRIBE_MEDIA_FILE_USER_PROMPT + '\n';
                break;
            }
            case COMMAND.DESCRIBE: {
                userPrompt += DESCRIBE_MEDIA_FILE_USER_PROMPT + '\n';
                break;
            }
            case COMMAND.SUMMARIZE: {
                userPrompt += SUMMARIZE_CHAT_USER_PROMPT + '\n';
                break;
            }
            default: {
                userPrompt += "User doesn't specify own request.\n";
                break;
            }
        }
        userPrompt += 'Refer to user in gender neutral tone.';

        const res = await this.llamaT.request(
            [
                {
                    role: 'system',
                    content: TASK_TEMPLATE_SYSTEM_PROMPT,
                },
                {
                    role: 'user',
                    content: userPrompt,
                },
            ],
            'low',
        );

        return Llama.toResponse(res);
    }

    async translate(text?: string): Promise<string> {
        if (!text) return '';

        const res = await this.llamaT.request([
            {
                role: 'system',
                content: TRANSLATE_DESCRIPTION_SYSTEM_PROMPT,
            },
            {
                role: 'user',
                content: text,
            },
        ]);

        return Llama.toResponse(res);
    }

    async rejectOverrideAttempt(text?: string): Promise<string> {
        if (!text) return '';

        const res = await this.llamaT.request(
            [
                {
                    role: 'system',
                    content: REJECT_OVERRIDE_SYSTEM_PROMPT,
                },
                {
                    role: 'user',
                    content: `<flagged_input>${text}</flagged_input>\n\n` + REJECT_OVERRIDE_USER_PROMPT,
                },
            ],
            'medium',
        );

        return Llama.toResponse(res);
    }

    async rejectUnacceptable(text?: string): Promise<string> {
        if (!text) return '';

        const res = await this.llamaT.request(
            [
                {
                    role: 'system',
                    content: REJECT_UNACCEPTABLE_SYSTEM_PROMPT,
                },
                {
                    role: 'user',
                    content: `<flagged_input>${text}</flagged_input>\n\n` + REJECT_UNACCEPTABLE_USER_PROMPT,
                },
            ],
            'medium',
        );

        return Llama.toResponse(res);
    }

    async parseSummarizeArgs(args: string = ''): Promise<SummarizeScope> {
        const req = args.trim();
        const fallback: SummarizeScope = { mode: 'count', count: DEFAULT_MESSAGES_SUMMARIZE_COUNT };

        if (!req) return fallback;

        const now = new Date();

        try {
            const res = await this.llamaM.request(
                [
                    {
                        role: 'system',
                        content: MESSAGE_SUMMARIZER_SCOPE_IDENTITY,
                    },
                    {
                        role: 'user',
                        content:
                            `CURRENT DATE AND TIME (UTC): ${now.toISOString()}\n` +
                            `CURRENT DATE AND TIME (LOCAL): ${DateTime.fromJSDate(now).toFormat('yyyy-MM-dd HH:mm:ss')}\n` +
                            `USER'S SCOPE REQUEST: ${req}`,
                    },
                ],
                'low',
            );

            const data = JSON.parse(Llama.toResponse(res));

            let scope: SummarizeScope | null = null;

            if (data && typeof data === 'object') {
                const obj = data as Record<string, unknown>;

                if (obj.mode === 'count') {
                    const count = Number(obj.count);

                    if (Number.isInteger(count) && count > 0) {
                        scope = { mode: 'count', count };
                    }
                } else if (obj.mode === 'range') {
                    const from = toScopeEpoch(obj.from, false);
                    const to = toScopeEpoch(obj.to, true);

                    if (!!from && !!to && from <= to) {
                        scope = { mode: 'range', from, to };
                    }
                }
            }

            if (!scope) {
                this.logger.warn(`Could not parse the summarize scope from the LLM response: ${Llama.toResponse(res)}`);
                return fallback;
            }

            return scope;
        } catch (error) {
            this.logger.warn(`Failed to parse the summarize scope: ${error}`);
            return fallback;
        }
    }

    async summarizeMessagesChunk(lines: string[]): Promise<string | undefined> {
        const chunk = lines.join('\n');

        if (!chunk.length) return;

        const res = await this.llamaT.request(
            [
                {
                    role: 'system',
                    content: MESSAGE_SUMMARIZER_IDENTITY,
                },
                {
                    role: 'user',
                    content: chunk,
                },
            ],
            'off',
        );

        return Llama.toResponse(res);
    }

    async summarizeEstimate(meta: ChatSummaryMetadata): Promise<string> {
        const estimate = `Messages count: ${meta.messagesCount}. Approximate estimate: ${formatEstimatedDuration(meta.estimate)}`;

        const res = await this.llamaT.request(
            [
                {
                    role: 'system',
                    content: SUMMARIZE_PROGRESS_SYSTEM_PROMPT,
                },
                {
                    role: 'user',
                    content: SUMMARIZE_CHAT_USER_PROMPT + p(estimate),
                },
            ],
            'low',
        );

        return Llama.toResponse(res);
    }

    async summarizeTranscripts(transcripts: string[]): Promise<string> {
        const res = await this.llamaT.request(
            [
                {
                    role: 'system',
                    content: SUMMARIZE_MESSAGES_SYSTEM_PROMPT,
                },
                {
                    role: 'user',
                    content: transcripts.join('\n'),
                },
            ],
            'hight',
        );

        return Llama.toResponse(res);
    }
}
