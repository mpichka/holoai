import type { Chat, User } from 'node-telegram-bot-api';
import type { ChatRepository, NewChatRecord, NewUserRecord, UserRepository } from '../utils/db/repositories';
import type { Container } from '../utils/di';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // One day

interface CacheEntry<T> {
    payload: T;
    timestamp: number;
}

export class HoloService {
    userRepository: UserRepository;
    chatRepository: ChatRepository;

    private userCache = new Map<number, CacheEntry<NewUserRecord>>();
    private chatCache = new Map<number, CacheEntry<NewChatRecord>>();

    constructor(container: Container) {
        const db = container.Database;
        this.userRepository = db.userRepository;
        this.chatRepository = db.chatRepository;
    }

    async upsertTgUser(user?: User) {
        if (!user) return;

        const payload: NewUserRecord = {
            tgId: user.id,
            is_bot: user.is_bot,
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            language_code: user.language_code,
        };

        if (this.isUnchanged(this.userCache, payload)) return;

        await this.userRepository.upsert(payload);

        this.userCache.set(payload.tgId, { payload, timestamp: Date.now() });
    }

    async upsertTgChat(chat?: Chat) {
        if (!chat) return;

        const payload: NewChatRecord = {
            tgId: chat.id,
            type: chat.type,
            title: chat.title,
            first_name: chat.first_name,
            last_name: chat.last_name,
            username: chat.username,
            is_forum: Boolean(chat.is_forum),
            is_direct_messages: Boolean(chat.is_direct_messages),
        };

        if (this.isUnchanged(this.chatCache, payload)) return;

        await this.chatRepository.upsert(payload);

        this.chatCache.set(payload.tgId, { payload, timestamp: Date.now() });
    }

    private isUnchanged<T extends { tgId: number }>(cache: Map<number, CacheEntry<T>>, payload: T): boolean {
        const entry = cache.get(payload.tgId);
        if (!entry) return false;

        if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
            cache.delete(payload.tgId);
            return false;
        }

        const cacheKeys = Object.keys(entry.payload);
        const payloadKeys = Object.keys(payload);

        if (cacheKeys.length !== payloadKeys.length) return false;

        for (const key of cacheKeys) {
            if ((entry.payload as Record<string, unknown>)[key] !== (payload as Record<string, unknown>)[key]) {
                return false;
            }
        }

        return true;
    }
}
