import type winston from 'winston';
import type { FileRecord, FileRepository } from '../../utils/db/repositories';
import type { Container } from '../../utils/di';
import type { TelegramBot } from '../../utils/tg';
import { AudioDescriber } from './audio/AudioDescriber';
import { MEDIA_KIND, type MediaKind } from './constants';
import { ImageDescriber } from './image/ImageDescriber';
import { VideoDescriber } from './video/VideoDescriber';

export class FileDescriberService {
    imageDescriber;
    audioDescriber;
    videoDescriber;
    logger: winston.Logger;
    files: FileRepository;
    tg: TelegramBot;

    constructor(container: Container) {
        this.imageDescriber = new ImageDescriber(container.Llama);
        this.audioDescriber = new AudioDescriber(container.Llama);
        this.videoDescriber = new VideoDescriber(container.Llama);

        this.logger = container.LoggerFactory.createLogger('FileDescriber');
        this.files = container.FileRepository;
        this.tg = container.TelegramBot;
    }

    async describe(file: FileRecord) {
        const existingFile = await this.files.findByUniqueTgId(file.telegramFileUniqueId);

        if (existingFile?.description?.trim()) return existingFile;

        try {
            const { data: tgData, mimeType: tgMimeType } = await this.tg.getFileContent(file.telegramFileId);

            const data = tgData.toString('base64');
            const mimeType = tgMimeType || file.mimeType;

            const kind = this.resolveKind(file.type, mimeType);

            let description: string | null = null;
            switch (kind) {
                case 'image': {
                    description = await this.imageDescriber.describe(data, mimeType);
                    break;
                }
                case 'audio': {
                    description = await this.audioDescriber.describe(data, mimeType);
                    break;
                }
                case 'video': {
                    description = await this.videoDescriber.describe(data, mimeType, file.duration);
                    break;
                }
                default: {
                    const message = `Could not determine a describable media kind (mime type: ${(tgMimeType || file.mimeType) ?? 'unknown'})`;

                    this.logger.warn(message);

                    await this.markBroken(file, message);

                    return;
                }
            }

            if (!description) {
                const message = `llama returned an empty description`;

                this.logger.warn(message);

                await this.markBroken(file, message);

                return;
            }

            await this.files.setDescription(file.id, description);

            return this.files.findById(file.id);
        } catch (error) {
            const message = JSON.stringify({ error });

            this.logger.warn(message);

            await this.markBroken(file, message);
        }
    }

    private resolveKind(type?: string, mimeType?: string): MediaKind | null {
        if (type && type !== 'sticker') {
            const kind = MEDIA_KIND[type];
            if (kind) return kind;
        }

        if (mimeType?.startsWith('image/')) return 'image';
        if (mimeType?.startsWith('video/')) return 'video';

        return null;
    }

    private async markBroken(file: FileRecord, reason: string): Promise<void> {
        this.logger.warn(`Cannot describe file ${file?.id} (${file?.type}): ${reason}`);

        if (!file.id) return;

        try {
            await this.files.setDescriptionError(file.id, reason);
        } catch (err) {
            this.logger.warn(`Cannot write description error for file ${file.id}: ${err}`);
        }
    }
}
