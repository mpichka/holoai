import { Llama } from '../../../utils/llama';
import {
    IMAGE_CATEGORIES,
    IMAGE_CATEGORY_SYSTEM_PROMPT,
    IMAGE_CATEGORY_USER_PROMPT,
    IMAGE_SYSTEM_PROMPT,
    IMAGE_UNKNOWN_PROMPT,
    IMAGE_USER_PROMPT,
} from './constants';

export class ImageDescriber {
    constructor(private readonly llama: Llama) {}

    async describe(data: string, mimeType?: string): Promise<string | null> {
        const payload = Llama.toContentPart('image', data, mimeType);

        const categoriesRes = await this.llama.request(
            [
                {
                    role: 'system',
                    content: IMAGE_CATEGORY_SYSTEM_PROMPT,
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: IMAGE_CATEGORY_USER_PROMPT,
                        },
                        payload,
                    ],
                },
            ],
            'low',
        );

        const categories = Llama.toResponse(categoriesRes)
            ?.split(',')
            .map((category) => IMAGE_CATEGORIES[category as keyof typeof IMAGE_CATEGORIES]) || [IMAGE_UNKNOWN_PROMPT];

        const res = await this.llama.request([
            {
                role: 'system',
                content: IMAGE_SYSTEM_PROMPT + '\n\n' + categories.join('\n\n'),
            },
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: IMAGE_USER_PROMPT,
                    },
                    payload,
                ],
            },
        ]);

        return Llama.toResponse(res);
    }
}
