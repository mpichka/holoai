import type winston from 'winston';
import { Container } from '../di';
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

    /** Number of parallel generations; must match llama.cpp `--parallel`. */
    private readonly poolSize: number;
    private busy = 0;
    private readonly pool: Array<() => void> = [];

    constructor(container: Container) {
        this.logger = container.LoggerFactory.createLogger('Llama');
        this.baseUrl = process.env.LLAMA_URL || 'http://localhost:8080/v1';
        this.completionUrl = `${this.baseUrl}/chat/completions`;
        this.poolSize = Math.max(1, Math.floor(Number(process.env.LLAMA_PARALLEL)) || 4);
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
        await this.acquire();

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
        } finally {
            this.release();
        }
    }

    isAvailable(): boolean {
        return this.busy < this.poolSize;
    }

    /**
     * How many parallel requests a caller may run, given it already runs `own` of them.
     * Free slots are added, requests waiting in the queue are subtracted. Never less than 1.
     */
    getConcurrencyLimit(own: number): number {
        const limit = own + this.poolSize - this.busy - this.pool.length;

        return Math.max(1, limit);
    }

    /**
     * Runs `worker` over `items` in parallel, following the pool load: every time a task finishes,
     * the pool is re-checked and new tasks are started up to the current limit.
     * Results are returned in the same order as the input.
     * If a worker throws, no new tasks are started and the first error is rethrown once running tasks settle.
     */
    async runConcurrently<T, R>(items: T[], worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
        const results: R[] = new Array(items.length);
        const running = new Set<Promise<void>>();
        let nextIndex = 0;
        let failure: { error: unknown } | undefined;

        while ((nextIndex < items.length && !failure) || running.size) {
            const limit = this.getConcurrencyLimit(running.size);

            while (nextIndex < items.length && !failure && running.size < limit) {
                const index = nextIndex++;
                const task: Promise<void> = worker(items[index], index)
                    .then((result) => {
                        results[index] = result;
                    })
                    .catch((error: unknown) => {
                        failure ??= { error };
                    })
                    .finally(() => running.delete(task));

                running.add(task);
            }

            await Promise.race(running);
        }

        if (failure) throw failure.error;

        return results;
    }

    get stats() {
        return {
            size: this.poolSize,
            busy: this.busy,
            free: this.poolSize - this.busy,
            queued: this.pool.length,
        };
    }

    private acquire(): Promise<void> {
        if (this.busy < this.poolSize) {
            this.busy++;
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            this.pool.push(resolve);
            this.logger.debug(`All ${this.poolSize} slots busy, request queued (${this.pool.length} waiting)`);
        });
    }

    private release() {
        const next = this.pool.shift();

        if (next) {
            next();
        } else {
            this.busy--;
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
