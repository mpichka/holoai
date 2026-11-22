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

    async upsert(payload: NewMessageRecord, trx?: Knex.Transaction): Promise<MessageRecord> {
        const conn = trx ?? this.knex;

        const res = await conn('messages')
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

    async getIdByTelegramId(chat_tg_id: number, message_tg_id: number): Promise<number | undefined> {
        const row = await this.knex('messages as m')
            .innerJoin('chats as c', 'c.id', 'm.chat_id')
            .where({ 'c.tg_id': chat_tg_id, 'm.message_tg_id': message_tg_id })
            .first('m.id');

        return row?.id;
    }

    async getMessages(
        chat_tg_id: number,
        { limit, offset, thread_tg_id }: { limit: number; offset: number; thread_tg_id?: number | null },
    ): Promise<any[]> {
        const ids = await this.knex('messages as m')
            .innerJoin('chats as c', 'c.id', 'm.chat_id')
            .where({ 'c.tg_id': chat_tg_id })
            .modify((query) => {
                if (thread_tg_id == null) query.whereNull('m.thread_tg_id');
                else query.where('m.thread_tg_id', thread_tg_id);
            })
            .orderBy('m.sent_at', 'asc')
            .limit(limit)
            .offset(offset)
            .select('m.id');

        if (!ids.length) return [];

        return this.knex('messages as m')
            .innerJoin('users as u', 'u.id', 'm.user_id')
            .innerJoin('chats as c', 'c.id', 'm.chat_id')
            .leftOuterJoin('attachments_to_messages as atm', 'atm.message_id', 'm.id')
            .leftOuterJoin('attachments as a', 'a.id', 'atm.attachment_id')
            .whereIn(
                'm.id',
                ids.map((row: { id: number }) => row.id),
            )
            .select(MESSAGE_SELECT_ALIASES)
            .orderBy('m.sent_at', 'asc')
            .orderBy('a.id');
    }

    async getMessagesInDateRange(
        chat_tg_id: number,
        { from, to, thread_tg_id }: { from: number; to: number; thread_tg_id?: number | null },
    ): Promise<any[]> {
        const ids = await this.knex('messages as m')
            .innerJoin('chats as c', 'c.id', 'm.chat_id')
            .where({ 'c.tg_id': chat_tg_id })
            .modify((query) => {
                if (thread_tg_id == null) query.whereNull('m.thread_tg_id');
                else query.where('m.thread_tg_id', thread_tg_id);
            })
            .whereBetween('m.sent_at', [from, to])
            .orderBy('m.sent_at', 'asc')
            .select('m.id');

        if (!ids.length) return [];

        return this.knex('messages as m')
            .innerJoin('users as u', 'u.id', 'm.user_id')
            .innerJoin('chats as c', 'c.id', 'm.chat_id')
            .leftOuterJoin('attachments_to_messages as atm', 'atm.message_id', 'm.id')
            .leftOuterJoin('attachments as a', 'a.id', 'atm.attachment_id')
            .whereIn(
                'm.id',
                ids.map((row: { id: number }) => row.id),
            )
            .select(MESSAGE_SELECT_ALIASES)
            .orderBy('m.sent_at', 'asc')
            .orderBy('a.id');
    }

    async markAsReply(id: number, reply_to_id: number) {
        await this.knex('messages').where({ id }).update({ reply_to_id });
    }

    async deleteById(id: number) {
        await this.knex('messages').where({ id }).delete();
    }

    async updateByTelegramId(chat_tg_id: number, message_tg_id: number, text: string) {
        const chat = this.knex('chats').select('id').where({ tg_id: chat_tg_id });
        await this.knex('messages')
            .whereIn('chat_id', chat)
            .andWhere({ message_tg_id })
            .update({ text });
    }

    async deleteByTelegramId(chat_tg_id: number, message_tg_id: number) {
        const chat = this.knex('chats').select('id').where({ tg_id: chat_tg_id });
        await this.knex('messages').whereIn('chat_id', chat).andWhere({ message_tg_id }).delete();
    }
}
