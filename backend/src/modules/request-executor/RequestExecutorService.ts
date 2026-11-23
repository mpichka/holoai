import type { Message } from 'node-telegram-bot-api';
import type { Container } from '../../core/di';
import type { Message as MessageRecord, RequestStatus } from '../../generated/prisma/client';
import { type FullMessageModel, RequestModel, toFullMessageModel } from '../../shared/database';
import type {
    ChatRepository,
    MessageRepository,
    RequestRepository,
    UserRepository,
} from '../../shared/database/repositories';
import { nowEpoch } from '../../shared/utils/datetime';

interface RequestUpdate {
    status: RequestStatus;
    error?: string;
    startedAt?: number;
    finishedAt?: number;
}

/** Database access for the request executor: queued requests, chat history and the bot's own messages. */
export class RequestExecutorService {
    userRepository: UserRepository;
    chatRepository: ChatRepository;
    messageRepository: MessageRepository;
    requestRepository: RequestRepository;

    constructor(container: Container) {
        const db = container.DatabaseService;

        this.userRepository = db.userRepository;
        this.chatRepository = db.chatRepository;
        this.messageRepository = db.messageRepository;
        this.requestRepository = db.requestRepository;
    }

    async getPendingRequests(limit: number): Promise<RequestModel[]> {
        const records = await this.requestRepository.getPending(limit);

        return records.map((record) => new RequestModel(record));
    }

    async updateRequest(id: number, data: RequestUpdate): Promise<RequestModel> {
        const record = await this.requestRepository.update(id, { ...data, updatedAt: nowEpoch() });

        return new RequestModel(record);
    }

    async getFullMessageById(id?: number): Promise<FullMessageModel | null> {
        if (!id) return null;

        const message = await this.messageRepository.getById(id);

        return message ? toFullMessageModel(message) : null;
    }

    async getFullMessages(
        chatTgId: number,
        limit: number,
        threadTgId: number | null,
        offset: number = 0,
    ): Promise<FullMessageModel[]> {
        const messages = await this.messageRepository.getMessages(chatTgId, { limit, offset, threadTgId });

        return messages.map(toFullMessageModel);
    }

    async getFullMessagesInDateRange(
        chatTgId: number,
        from: number,
        to: number,
        threadTgId: number | null,
    ): Promise<FullMessageModel[]> {
        const messages = await this.messageRepository.getMessagesInDateRange(chatTgId, { from, to, threadTgId });

        return messages.map(toFullMessageModel);
    }

    /** Stores a message sent by the bot, linking it to the replied message when present. */
    async saveSentMessage(sent: Message, replyToMessageTgId?: number): Promise<MessageRecord | null> {
        const from = sent.from;
        let replyToId: number | undefined;

        if (!from) return null;

        const [user, chat] = await Promise.all([
            this.userRepository.upsert({
                tgId: from.id,
                isBot: from.is_bot,
                firstName: from.first_name,
                lastName: from.last_name,
                username: from.username,
                languageCode: from.language_code,
            }),
            this.chatRepository.upsert({
                tgId: sent.chat.id,
                type: sent.chat.type,
                title: sent.chat.title,
                firstName: sent.chat.first_name,
                lastName: sent.chat.last_name,
                username: sent.chat.username,
                isForum: Boolean(sent.chat.is_forum),
                isDirectMessages: Boolean(sent.chat.is_direct_messages),
            }),
        ]);

        if (replyToMessageTgId) {
            replyToId = await this.messageRepository.getIdByTelegramId(sent.chat.id, replyToMessageTgId);
        }

        return this.messageRepository.upsert({
            chatId: chat.id,
            userId: user.id,
            messageTgId: sent.message_id,
            threadTgId: sent.message_thread_id,
            replyToId,
            sentAt: sent.date,
            text: sent.text || sent.caption,
        });
    }

    updateMessageText(chatTgId: number, messageTgId: number, text: string) {
        return this.messageRepository.updateByTelegramId(chatTgId, messageTgId, text);
    }

    deleteMessageByTelegramId(chatTgId: number, messageTgId: number) {
        return this.messageRepository.deleteByTelegramId(chatTgId, messageTgId);
    }
}
