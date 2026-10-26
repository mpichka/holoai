import type { Knex } from 'knex';

export interface MessageRecord {
    id: number;
    created_at: number;
    updated_at: number;

    chat_id: number;
    user_id: number;

    message_tg_id: number;
    thread_tg_id?: number;
    reply_to_id?: number;
    sent_at: number;
    text?: string;
}

export type NewMessageRecord = Omit<MessageRecord, 'id' | 'created_at' | 'updated_at'>;

export class MessageRepository {
    constructor(private readonly knex: Knex) {}

    async upsert(message: NewMessageRecord): Promise<MessageRecord> {
        const res = await this.knex('messages')
            .insert(message)
            .onConflict('message_tg_id')
            .merge(['thread_tg_id', 'reply_to_id', 'sent_at', 'text'])
            .returning<MessageRecord[]>('*');

        return res[0];
    }
}
