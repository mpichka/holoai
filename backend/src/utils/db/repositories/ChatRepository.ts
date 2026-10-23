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

    async upsert(user: NewChatRecord): Promise<void> {
        await this.knex('chats')
            .insert(user)
            .onConflict('tgId')
            .merge(['type', 'title', 'username', 'is_forum', 'is_direct_messages']);
    }
}
