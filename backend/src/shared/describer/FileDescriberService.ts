import type winston from 'winston';
import type { Container } from '../../core/di';
import type { TelegramBot } from '../../core/tg';
import type { LinkedAttachmentModel } from '../database';
import { AttachmentType, STICKER_TYPES, type AttachmentRepository } from '../database/repositories';
import { AudioDescriber } from './audio/AudioDescriber';
import { MEDIA_KIND, MediaKind } from './constants';
import { ImageDescriber } from './image/ImageDescriber';
import { VideoDescriber } from './video/VideoDescriber';

export class FileDescriberService {
    imageDescriber: ImageDescriber;
    audioDescriber: AudioDescriber;
    videoDescriber: VideoDescriber;
    logger: winston.Logger;
    attachmentRepository: AttachmentRepository;
    tg: TelegramBot;

    constructor(container: Container) {
        this.imageDescriber = new ImageDescriber(container.Llama);
        this.audioDescriber = new AudioDescriber(container.Llama);
        this.videoDescriber = new VideoDescriber(container.Llama);

        this.logger = container.LoggerFactory.createLogger('FileDescriber');
        this.attachmentRepository = container.DatabaseService.attachmentRepository;
        this.tg = container.TelegramBot;
    }

    async describe(attachment: LinkedAttachmentModel): Promise<LinkedAttachmentModel | undefined> {
        if (attachment.aiDescription?.trim()) return attachment;

        try {
            const { data: tgData, mimeType: tgMimeType } = await this.tg.getFileContent(attachment.rel.fileTgId);

            const data = tgData.toString('base64');
            const mimeType = tgMimeType || attachment.mimeType || undefined;

            const kind = this.resolveKind(attachment.type, mimeType);

            let description: string | null = null;
            switch (kind) {
                case 'image': {
                    description = await this.imageDescriber.describe(data, mimeType);
                    break;
                }
                case 'audio': {
                    description = await this.audioDescriber.describe(data, mimeType, attachment.performer ?? undefined);
                    break;
                }
                case 'video': {
                    description = await this.videoDescriber.describe(
                        data,
                        mimeType,
                        attachment.duration ?? undefined,
                        attachment.fileSize ?? undefined,
                    );
                    break;
                }
                default: {
                    const message = `Could not determine a describable media kind (mime type: ${mimeType || 'unknown'})`;
                    this.logger.warn(`Cannot describe file ${attachment?.id} (${attachment?.type}): ${message}`);
                    return;
                }
            }

            if (!description) {
                const message = `llama returned an empty description`;
                this.logger.warn(`Cannot describe file ${attachment?.id} (${attachment?.type}): ${message}`);
                return;
            }

            await this.attachmentRepository.setAiDescription(attachment.id, description);
            attachment.aiDescription = description;
            return attachment;
        } catch (error) {
            const message = JSON.stringify({ error });
            this.logger.warn(`Cannot describe file ${attachment?.id} (${attachment?.type}): ${message}`);
        }
    }

    private resolveKind(type?: number, mimeType?: string): MediaKind | null {
        if (type && !STICKER_TYPES.includes(type)) {
            const kind = MEDIA_KIND[type as AttachmentType];
            if (kind) return kind;
        }

        if (mimeType?.startsWith('image/')) return 'image';
        if (mimeType?.startsWith('video/')) return 'video';

        return null;
    }
}
