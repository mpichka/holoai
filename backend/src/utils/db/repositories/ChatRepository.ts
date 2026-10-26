import type { Knex } from 'knex';

export interface ChatRecord {
    id: number;
    created_at: number;
    updated_at: number;

    tg_id: number;
    type: string;
    title?: string;
    first_name?: string;
    last_name?: string;
    username?: string;
    is_forum: boolean;
    is_direct_messages: boolean;
}

export type NewChatRecord = Omit<ChatRecord, 'id' | 'created_at' | 'updated_at'>;

export class ChatRepository {
    constructor(private readonly knex: Knex) {}

    async upsert(chat: NewChatRecord): Promise<ChatRecord> {
        const res = await this.knex('chats')
            .insert(chat)
            .onConflict('tg_id')
            .merge(['type', 'title', 'username', 'is_forum', 'is_direct_messages'])
            .returning<ChatRecord[]>('*');

        return res[0];
    }
}
