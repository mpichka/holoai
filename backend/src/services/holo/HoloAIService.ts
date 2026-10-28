import type { Container } from '../../utils/di';
import { Llama } from '../../utils/llama';
import { DEFYING_COMMANDS_SYSTEM_PROMPT } from './prompts';
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
}
