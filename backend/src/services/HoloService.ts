import type { Chat, Message, User } from 'node-telegram-bot-api';
import type {
    ChatRecord,
    ChatRepository,
    MessageRecord,
    MessageRepository,
    NewChatRecord,
    NewMessageRecord,
    NewUserRecord,
    UserRecord,
    UserRepository,
} from '../utils/db/repositories';
import type { Container } from '../utils/di';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // One day

interface CacheEntry<T> {
    payload: T;
    timestamp: number;
}

interface MessageCreationOptions {
    userId: number;
    chatId: number;
    replyToId?: number;
}

export class HoloService {
    userRepository: UserRepository;
    chatRepository: ChatRepository;
    messageRepository: MessageRepository;

    private userCache = new Map<number, CacheEntry<UserRecord>>();
    private chatCache = new Map<number, CacheEntry<ChatRecord>>();

    constructor(container: Container) {
        const db = container.Database;
        this.userRepository = db.userRepository;
        this.chatRepository = db.chatRepository;
        this.messageRepository = db.messageRepository;
    }

    async upsertTgUser(user?: User): Promise<UserRecord | null> {
        if (!user) return null;

        const payload: NewUserRecord = {
            tgId: user.id,
            is_bot: user.is_bot,
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            language_code: user.language_code,
        };

        const cache = this.getCached<UserRecord>(this.userCache, payload);

        if (cache) return cache;

        const data = await this.userRepository.upsert(payload);

        this.userCache.set(payload.tgId, { payload: data, timestamp: Date.now() });

        return data;
    }

    async upsertTgChat(chat?: Chat): Promise<ChatRecord | null> {
        if (!chat) return null;

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

        const cache = this.getCached<ChatRecord>(this.chatCache, payload);

        if (cache) return cache;

        const data = await this.chatRepository.upsert(payload);

        this.chatCache.set(payload.tgId, { payload: data, timestamp: Date.now() });

        return data;
    }

    async upsertMessage(message: Message, options: MessageCreationOptions): Promise<MessageRecord | null> {
        if (!message) return null;

        const payload: NewMessageRecord = {
            chatId: options.chatId,
            userId: options.userId,
            messageTgId: message.message_id,
            threadTgId: message.message_thread_id,
            replyToId: options.replyToId,
            sentAt: message.date,
            text: message.text || message.caption,
        };

        return this.messageRepository.upsert(payload);
    }

    private getCached<T>(cache: Map<number, CacheEntry<any>>, payload: { tgId: number }): T | null {
        const entry = cache.get(payload.tgId);
        if (!entry) return null;

        if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
            cache.delete(payload.tgId);
            return null;
        }

        const cacheKeys = Object.keys(entry.payload);
        const payloadKeys = Object.keys(payload);

        if (cacheKeys.length !== payloadKeys.length) return null;

        for (const key of cacheKeys) {
            if ((entry.payload as Record<string, unknown>)[key] !== (payload as Record<string, unknown>)[key]) {
                return null;
            }
        }

        return entry.payload as T;
    }
}
