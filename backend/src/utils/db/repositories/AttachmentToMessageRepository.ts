import type { Knex } from 'knex';

export interface AttachmentToMessageRecord {
    attachment_id: number;
    message_id: number;
    // Id that used to fetch the file content
    file_tg_id: string;
    // Optional text that was sent alongside the attachment
    caption?: string;
    // Multiple attachments sent as one message
    media_group_id?: string;
}

export class AttachmentToMessageRepository {
    constructor(private readonly knex: Knex) {}

    async upsert(payload: AttachmentToMessageRecord): Promise<AttachmentToMessageRecord> {
        const res = await this.knex('attachments_to_messages')
            .insert(payload)
            .onConflict(['attachment_id', 'message_id'])
            .merge(['file_tg_id', 'caption', 'media_group_id'])
            .returning<AttachmentToMessageRecord[]>('*');

        return res[0];
    }
}
