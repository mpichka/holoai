import type { Knex } from 'knex';
import { ATTACHMENT_COLS, ATTACHMENT_TO_MESSAGE_COLS, CHAT_COLS, MESSAGE_COLS, USER_COLS } from '../constants';
import { mapToAlias } from '../utils';

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

const MESSAGE_SELECT_ALIASES = [
    ...mapToAlias('m', 'm_', MESSAGE_COLS),
    ...mapToAlias('u', 'u_', USER_COLS),
    ...mapToAlias('c', 'c_', CHAT_COLS),
    ...mapToAlias('a', 'a_', ATTACHMENT_COLS),
    ...mapToAlias('atm', 'atm_', ATTACHMENT_TO_MESSAGE_COLS),
];

export class MessageRepository {
    constructor(private readonly knex: Knex) {}

    async upsert(payload: NewMessageRecord): Promise<MessageRecord> {
        const res = await this.knex('messages')
            .insert(payload)
            .onConflict(['chat_id', 'message_tg_id'])
            .merge(['thread_tg_id', 'reply_to_id', 'sent_at', 'text'])
            .returning<MessageRecord[]>('*');

        return res[0];
    }

    async getMessage(chat_tg_id: number, message_tg_id: number): Promise<any[]> {
        return this.knex('messages as m')
            .innerJoin('users as u', 'u.id', 'm.user_id')
            .innerJoin('chats as c', 'c.id', 'm.chat_id')
            .leftOuterJoin('attachments_to_messages as atm', 'atm.message_id', 'm.id')
            .leftOuterJoin('attachments as a', 'a.id', 'atm.attachment_id')
            .where({ 'c.tg_id': chat_tg_id, 'm.message_tg_id': message_tg_id })
            .select(MESSAGE_SELECT_ALIASES)
            .orderBy('a.id');
    }
}
