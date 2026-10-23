import type { Knex } from 'knex';

export interface UserRecord {
    id: number;
    createdAt: number;
    updatedAt: number;

    tgId: number;
    is_bot: boolean;
    first_name?: string;
    last_name?: string;
    username?: string;
    language_code?: string;
}

export type NewUserRecord = Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'>;

export class UserRepository {
    constructor(private readonly knex: Knex) {}

    async upsert(user: NewUserRecord): Promise<void> {
        await this.knex('users')
            .insert(user)
            .onConflict('tgId')
            .merge(['is_bot', 'first_name', 'last_name', 'username', 'language_code']);
    }
}
