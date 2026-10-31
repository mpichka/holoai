import type winston from 'winston';
import type { Container } from '../di';
import type {
    ChatCompletionRequest,
    ChatCompletionResponse,
    ChatMessage,
    ContentPart,
    HealthCheckResponse,
    ToolDefinition,
} from './types';

type Reasoning = 'off' | 'low' | 'medium' | 'hight' | 'max';

const getReasoningBudger = (value: Reasoning) => {
    switch (value) {
        case 'low':
            return 512;
        case 'medium':
            return 2048;
        case 'hight':
            return 8192;
    }
};

type MediaKind = 'text' | 'image' | 'video' | 'audio';

export class Llama {
    baseUrl: string;
    completionUrl: string;
    logger: winston.Logger;

    constructor(container: Container) {
        this.logger = container.LoggerFactory.createLogger('Llama');
        this.baseUrl = process.env.LLAMA_URL || 'http://localhost:8080/v1';
        this.completionUrl = `${this.baseUrl}/chat/completions`;
    }

    async health() {
        const url = `${this.baseUrl}/health`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await response.json();
            return data as HealthCheckResponse;
        } catch (err) {
            this.logger.error(`GET ${url} failed: ${describeError(err)}`);
            throw err;
        }
    }

    async request(messages: ChatMessage[], reasoning: Reasoning = 'hight', tools?: ToolDefinition[]) {
        const request: ChatCompletionRequest = {
            messages,
            tools,
            tool_choice: tools?.length ? 'auto' : undefined,
            chat_template_kwargs: {
                enable_thinking: reasoning !== 'off',
            },
            cache_prompt: true,
        };

        if (reasoning !== 'off' && reasoning !== 'max') {
            request.thinking_budget_tokens = getReasoningBudger(reasoning);
        }

        try {
            const response = await fetch(this.completionUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`llama server error ${response.status}: ${err}`);
            }

            const data = await response.json();

            return data as ChatCompletionResponse;
        } catch (err) {
            this.logger.error(`POST ${this.completionUrl} failed: ${describeError(err)}`);
            throw err;
        }
    }

    static toContentPart(kind: MediaKind, data: string, mimeType?: string): ContentPart {
        switch (kind) {
            case 'text':
                return { type: 'text', text: data };
            case 'image':
                return {
                    type: 'image_url',
                    image_url: { url: `data:${mimeType};base64,${data}` },
                };
            case 'video':
                return { type: 'input_video', input_video: { data } };
            case 'audio':
                return {
                    type: 'input_audio',
                    input_audio: {
                        data,
                        format: mimeType?.split('/')[1] ?? 'mp3',
                    },
                };
        }
    }

    static toResponse(data: ChatCompletionResponse) {
        return data.choices[0].message.content || 'Unexpected error happens. Somebody, tell my author about.';
    }
}

function describeError(error: unknown): string {
    if (error instanceof Error && error.cause) {
        return `${error} (cause: ${error.cause})`;
    }

    return `${error}`;
}
