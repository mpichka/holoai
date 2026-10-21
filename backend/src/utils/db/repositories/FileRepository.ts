import type { Container } from '../../di';
import type { FilePhotoSize, FileType } from '../types';

export interface FileRecord {
    id: number;
    createdAt: string;
    /** `messages.id` — the surrogate key, not the Telegram `message_id`. */
    messageId: number;
    type: FileType;
    /**
     * Pass back to sendPhoto/sendDocument/... to resend the file without
     * uploading it. Only valid for this bot, and Telegram may reissue it.
     */
    telegramFileId: string;
    /** Stable identity of the file itself; the same across reissues. */
    telegramFileUniqueId: string;
    fileName?: string;
    mimeType?: string;
    fileSize?: number;
    width?: number;
    height?: number;
    duration?: number;
    /** Every resolution Telegram offers. Only set for photos and live photos. */
    photoSizes?: FilePhotoSize[];
    /** A ai-generated description of the file's content. */
    description?: string;
    /** Presence marks broken files. */
    descriptionError?: string;
}

export type NewFileRecord = Omit<FileRecord, 'id' | 'createdAt' | 'messageId'>;

/**
 * Stores the media attached to messages. One row per media item, so a photo
 * is a single row carrying all of its sizes rather than one row per size.
 */
export class FileRepository {
    private knex;

    constructor(container: Container) {
        this.knex = container.Database.knex;
    }

    async createForMessage(messageId: number, files: NewFileRecord[]): Promise<void> {
        if (files.length === 0) return;

        await this.knex('files')
            .insert(
                files.map((file) => ({
                    message_id: messageId,
                    type: file.type,
                    telegram_file_id: file.telegramFileId,
                    telegram_file_unique_id: file.telegramFileUniqueId,
                    file_name: file.fileName,
                    mime_type: file.mimeType,
                    file_size: file.fileSize,
                    width: file.width,
                    height: file.height,
                    duration: file.duration,
                    photo_sizes: file.photoSizes ? JSON.stringify(file.photoSizes) : undefined,
                })),
            )
            .onConflict(['message_id', 'telegram_file_unique_id'])
            .ignore();
    }

    async findById(id: number): Promise<FileRecord | undefined> {
        return await this.knex('files').where({ id }).first();
    }

    async updateDescription(id: number, description: string): Promise<void> {
        await this.knex('files').where({ id }).update({ description });
    }

    async setDescriptionError(id: number, reason: string): Promise<void> {
        await this.knex('files').where({ id }).update({ description_error: reason });
    }

    async findByUniqueTgId(telegramFileUniqueId: string): Promise<FileRecord | undefined> {
        return this.knex('files').where({ telegram_file_unique_id: telegramFileUniqueId }).first();
    }
}
