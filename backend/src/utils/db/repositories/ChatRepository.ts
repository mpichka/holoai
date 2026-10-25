import type { Knex } from 'knex';

export interface ChatRecord {
    id: number;
    createdAt: number;
    updatedAt: number;

    tgId: number;
    type: string;
    title?: string;
    first_name?: string;
    last_name?: string;
    username?: string;
    is_forum: boolean;
    is_direct_messages: boolean;
}

export type NewChatRecord = Omit<ChatRecord, 'id' | 'createdAt' | 'updatedAt'>;

export class ChatRepository {
    constructor(private readonly knex: Knex) {}

    async upsert(chat: NewChatRecord): Promise<ChatRecord> {
        return this.knex('chats')
            .insert(chat)
            .onConflict('tgId')
            .merge(['type', 'title', 'username', 'is_forum', 'is_direct_messages'])
            .returning<ChatRecord>('*');
    }
}
