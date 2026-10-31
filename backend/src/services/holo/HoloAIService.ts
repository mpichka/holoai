import type { Container } from '../../utils/di';
import { Llama } from '../../utils/llama';
import {
    DEFYING_COMMANDS_SYSTEM_PROMPT,
    FAIL_TO_DELETE_OLD_REPLY_USER_PROMPT,
    FAIL_TO_DELETE_REPLY_SYSTEM_PROMPT,
    FAIL_TO_DELETE_REPLY_USER_PROMPT,
    FAIL_TO_DELETE_TRANSCRIBE_USER_PROMPT,
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

    async taskAcknowledge(): Promise<string> {
        const res = await this.llama.request([
            {
                role: 'system',
                content: TASK_ACKNOWLEDGED_SYSTEM_PROMPT,
            },
            {
                role: 'user',
                content: TRANSCRIBE_MEDIA_FILE_USER_PROMPT,
            },
        ]);

        return Llama.toResponse(res);
    }

    async couldNotDeleteReply(): Promise<string> {
        const res = await this.llama.request([
            {
                role: 'system',
                content: FAIL_TO_DELETE_REPLY_SYSTEM_PROMPT,
            },
            {
                role: 'user',
                content: FAIL_TO_DELETE_REPLY_USER_PROMPT,
            },
        ]);

        return Llama.toResponse(res);
    }

    async couldNotDeleteOldReply(): Promise<string> {
        const res = await this.llama.request([
            {
                role: 'system',
                content: FAIL_TO_DELETE_REPLY_SYSTEM_PROMPT,
            },
            {
                role: 'user',
                content: FAIL_TO_DELETE_OLD_REPLY_USER_PROMPT,
            },
        ]);

        return Llama.toResponse(res);
    }

    async couldNotTranscribe(): Promise<string> {
        const res = await this.llama.request([
            {
                role: 'system',
                content: FAIL_TO_DELETE_REPLY_SYSTEM_PROMPT,
            },
            {
                role: 'user',
                content: FAIL_TO_DELETE_TRANSCRIBE_USER_PROMPT,
            },
        ]);

        return Llama.toResponse(res);
    }

    async generateTranscribeTemplateResponse(): Promise<string> {
        const res = await this.llama.request([
            {
                role: 'system',
                content: TASK_TEMPLATE_SYSTEM_PROMPT,
            },
            {
                role: 'user',
                content: 'Write the template. Refer to user in gender neutral tone.',
            },
        ]);

        return Llama.toResponse(res);
    }
}
