import type { Knex } from 'knex';

export interface UserRecord {
    id: number;
    created_at: number;
    updated_at: number;

    tg_id: number;
    is_bot: boolean;
    first_name?: string;
    last_name?: string;
    username?: string;
    language_code?: string;
}

export type NewUserRecord = Omit<UserRecord, 'id' | 'created_at' | 'updated_at'>;

export class UserRepository {
    constructor(private readonly knex: Knex) {}

    async upsert(user: NewUserRecord): Promise<UserRecord> {
        return this.knex('users')
            .insert(user)
            .onConflict('tg_id')
            .merge(['is_bot', 'first_name', 'last_name', 'username', 'language_code'])
            .returning<UserRecord>('*');
    }
}
