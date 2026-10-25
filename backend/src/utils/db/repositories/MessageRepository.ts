import type { Knex } from 'knex';

export interface MessageRecord {
    id: number;
    createdAt: number;
    updatedAt: number;

    chatId: number;
    userId: number;

    messageTgId: number;
    threadTgId?: number;
    replyToId?: number;
    sentAt: number;
    text?: string;
}

export type NewMessageRecord = Omit<MessageRecord, 'id' | 'createdAt' | 'updatedAt'>;

export class MessageRepository {
    constructor(private readonly knex: Knex) {}

    async upsert(message: NewMessageRecord): Promise<MessageRecord> {
        return this.knex('messages')
            .insert(message)
            .onConflict(['messageTgId'])
            .merge(['threadTgId', 'replyToId', 'sentAt', 'text'])
            .returning<MessageRecord>('*');
    }
}
