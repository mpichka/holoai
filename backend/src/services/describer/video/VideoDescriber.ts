import { Llama } from '../../../utils/llama';
import {
    VIDEO_CATEGORIES,
    VIDEO_CATEGORY_SYSTEM_PROMPT,
    VIDEO_CATEGORY_USER_PROMPT,
    VIDEO_SYSTEM_PROMPT,
    VIDEO_UNKNOWN_PROMPT,
    VIDEO_USER_PROMPT,
} from './constants';
import { trimToFirstSeconds } from '../ffmpeg';

export class VideoDescriber {
    MAX_DURATION_IN_SECONDS = 60;

    constructor(private readonly llama: Llama) {}

    async describe(data: string, mimeType?: string, duration?: number): Promise<string | null> {
        let file: string | null = data;

        if (!duration || duration > this.MAX_DURATION_IN_SECONDS) {
            file = await trimToFirstSeconds(data, mimeType || 'application/octet-stream', this.MAX_DURATION_IN_SECONDS);
        }

        const payload = Llama.toContentPart('video', file || data, mimeType);

        const categoriesRes = await this.llama.request(
            [
                {
                    role: 'system',
                    content: VIDEO_CATEGORY_SYSTEM_PROMPT,
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: VIDEO_CATEGORY_USER_PROMPT,
                        },
                        payload,
                    ],
                },
            ],
            'low',
        );

        const categories = Llama.toResponse(categoriesRes)
            ?.split(',')
            .map((category) => VIDEO_CATEGORIES[category as keyof typeof VIDEO_CATEGORIES]) || [VIDEO_UNKNOWN_PROMPT];

        const res = await this.llama.request([
            {
                role: 'system',
                content: VIDEO_SYSTEM_PROMPT + '\n\n' + categories.join('\n\n'),
            },
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: VIDEO_USER_PROMPT,
                    },
                    payload,
                ],
            },
        ]);

        return Llama.toResponse(res);
    }
}
