import { COMMAND, CommandTypes } from '../../constants';
import type { Container } from '../../utils/di';
import { Llama } from '../../utils/llama';
import {
    DEFYING_COMMANDS_SYSTEM_PROMPT,
    DESCRIBE_MEDIA_FILE_USER_PROMPT,
    FAIL_TO_DELETE_OLD_REPLY_USER_PROMPT,
    FAIL_TO_DELETE_REPLY_USER_PROMPT,
    FAIL_TO_DESCRIBE_USER_PROMPT,
    FAIL_TO_TRANSCRIBE_USER_PROMPT,
    FAILED_TASK_SYSTEM_PROMPT,
    TASK_ACKNOWLEDGED_SYSTEM_PROMPT,
    TASK_TEMPLATE_SYSTEM_PROMPT,
    TRANSCRIBE_MEDIA_FILE_USER_PROMPT,
} from './prompts';
import { Command } from './types';

export class HoloAIService {
    llama: Llama;

    constructor(container: Container) {
        this.llama = container.Llama;
    }

    async defineCommand(message?: string): Promise<Command[]> {
        if (!message) return [];

        const res = await this.llama.request([
            {
                role: 'system',
                content: DEFYING_COMMANDS_SYSTEM_PROMPT,
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
        }

        const res = await this.llama.request([
            {
                role: 'system',
                content: TASK_ACKNOWLEDGED_SYSTEM_PROMPT,
            },
            {
                role: 'user',
                content: userPrompt,
            },
        ]);

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
        }

        const res = await this.llama.request([
            {
                role: 'system',
                content: FAILED_TASK_SYSTEM_PROMPT,
            },
            {
                role: 'user',
                content: userPrompt,
            },
        ]);

        return Llama.toResponse(res);
    }

    async failToDeleteReply(old = false): Promise<string> {
        const userPrompt = old ? FAIL_TO_DELETE_OLD_REPLY_USER_PROMPT : FAIL_TO_DELETE_REPLY_USER_PROMPT;

        const res = await this.llama.request([
            {
                role: 'system',
                content: FAILED_TASK_SYSTEM_PROMPT,
            },
            {
                role: 'user',
                content: userPrompt,
            },
        ]);

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
            default: {
                userPrompt += "User doesn't specify own request.\n";
                break;
            }
        }
        userPrompt += 'Refer to user in gender neutral tone.';

        const res = await this.llama.request([
            {
                role: 'system',
                content: TASK_TEMPLATE_SYSTEM_PROMPT,
            },
            {
                role: 'user',
                content: userPrompt,
            },
        ]);

        return Llama.toResponse(res);
    }
}
