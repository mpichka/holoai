import type { Knex } from 'knex';

export interface AttachmentToMessageRecord {
    attachment_id: number;
    message_id: number;
    // Id that used to fetch the file content
    file_tg_id: number;
    // Optional text that was sent alongside the attachment
    caption?: string;
    // Multiple attachments sent as one message
    media_group_id?: string;
}

export class AttachmentToMessageRepository {
    constructor(private readonly knex: Knex) {}

    async upsert(attachmentToMessage: AttachmentToMessageRecord): Promise<AttachmentToMessageRecord> {
        let res: AttachmentToMessageRecord[] = await this.knex('attachments_to_messages').where({
            attachment_id: attachmentToMessage.attachment_id,
            message_id: attachmentToMessage.message_id,
        });

        if (!res) {
            res = await this.knex('attachments_to_messages')
                .insert(attachmentToMessage)
                .returning<AttachmentToMessageRecord[]>('*');
        }

        return res[0];
    }
}
