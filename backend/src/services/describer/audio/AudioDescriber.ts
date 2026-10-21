import { Llama } from '../../../utils/llama';
import { convertToMp3 } from '../ffmpeg';
import {
    AUDIO_CATEGORY_SYSTEM_PROMPT,
    AUDIO_CATEGORY_USER_PROMPT,
    AUDIO_ILLEGIBLE_SYSTEM_PROMPT,
    AUDIO_ILLEGIBLE_USER_PROMPT,
    AUDIO_MUSIC_SYSTEM_PROMPT,
    AUDIO_MUSIC_USER_PROMPT,
    AUDIO_SPEECH_SYSTEM_PROMPT,
    AUDIO_SPEECH_USER_PROMPT,
} from './constants';

export class AudioDescriber {
    constructor(private readonly llama: Llama) {}

    async describe(data: string, mimeType?: string): Promise<string | null> {
        let file: string | null = data;

        if (mimeType !== 'audio/mp3') {
            file = await convertToMp3(data, mimeType || 'application/octet-stream');
        }

        const payload = Llama.toContentPart('audio', file || data, mimeType);

        const categoryRes = await this.llama.request(
            [
                {
                    role: 'system',
                    content: AUDIO_CATEGORY_SYSTEM_PROMPT,
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: AUDIO_CATEGORY_USER_PROMPT,
                        },
                        payload,
                    ],
                },
            ],
            'low',
        );

        let res;
        switch (Llama.toResponse(categoryRes)) {
            case 'speech': {
                res = await this.llama.request([
                    {
                        role: 'system',
                        content: AUDIO_SPEECH_SYSTEM_PROMPT,
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: AUDIO_SPEECH_USER_PROMPT,
                            },
                            payload,
                        ],
                    },
                ]);

                break;
            }
            case 'music': {
                res = await this.llama.request([
                    {
                        role: 'system',
                        content: AUDIO_MUSIC_SYSTEM_PROMPT,
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: AUDIO_MUSIC_USER_PROMPT,
                            },
                            payload,
                        ],
                    },
                ]);

                break;
            }
            default: {
                res = await this.llama.request([
                    {
                        role: 'system',
                        content: AUDIO_ILLEGIBLE_SYSTEM_PROMPT,
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: AUDIO_ILLEGIBLE_USER_PROMPT,
                            },
                            payload,
                        ],
                    },
                ]);
            }
        }

        return Llama.toResponse(res);
    }
}
