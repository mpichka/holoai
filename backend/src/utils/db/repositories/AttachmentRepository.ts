import type { Knex } from 'knex';

export const ATTACHMENT_TYPE = Object.freeze({
    AUDIO: 10,
    VOICE: 11,
    PHOTO: 20,
    ANIMATION: 21,
    LIVE_PHOTO: 22,
    STICKER_PHOTO: 30,
    STICKER_ANIMATION: 31,
    STICKER_VIDEO: 32,
    VIDEO: 40,
    VIDEO_NOTE: 41,
});

export type AttachmentType = (typeof ATTACHMENT_TYPE)[keyof typeof ATTACHMENT_TYPE];

export interface AttachmentRecord {
    id: number;
    created_at: number;
    updated_at: number;

    type: AttachmentType;
    file_tg_uid: string;
    file_size: number;
    mime_type?: string;
    file_name?: string;
    duration?: number;
    performer?: string;

    ai_description?: string;
}

export type NewAttachmentRecord = Omit<AttachmentRecord, 'id' | 'created_at' | 'updated_at' | 'ai_description'>;

export class AttachmentRepository {
    constructor(private readonly knex: Knex) {}

    async upsert(chat: NewAttachmentRecord): Promise<AttachmentRecord> {
        const res = await this.knex('attachments')
            .insert(chat)
            .onConflict('file_tg_uid')
            .merge(['file_size', 'mime_type', 'file_name', 'duration', 'performer'])
            .returning<AttachmentRecord[]>('*');

        return res[0];
    }
}
