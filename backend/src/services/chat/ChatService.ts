import type { Message } from 'node-telegram-bot-api';
import type { User } from '../../generated/prisma/client';
import type {
    AttachmentRepository,
    AttachmentToMessageRepository,
    ChatRepository,
    MessageRepository,
    UserRepository,
} from '../../utils/db/repositories';
import type { Container } from '../../utils/di';
import { TelegramBot } from '../../utils/tg';
import type { ChatAction } from '../../utils/tg/constants';
import type { SendOptions } from '../../utils/tg/types';

export class ChatService {
    tg: TelegramBot;
    userRepository: UserRepository;
    chatRepository: ChatRepository;
    messageRepository: MessageRepository;
    attachmentRepository: AttachmentRepository;
    attachmentToMessageRepository: AttachmentToMessageRepository;

    constructor(container: Container) {
        const db = container.Database;
        this.userRepository = db.userRepository;
        this.chatRepository = db.chatRepository;
        this.messageRepository = db.messageRepository;
        this.attachmentRepository = db.attachmentRepository;
        this.attachmentToMessageRepository = db.attachmentToMessageRepository;
        this.tg = container.TelegramBot;
    }

    action(chatId: number, action: ChatAction, threadId?: number) {
        return this.tg.action(chatId, action, threadId);
    }

    async sendMessage(text: string, chatId: number, options: SendOptions = {}): Promise<Message> {
        const sent = await this.tg.sendMessage(text, chatId, options);

        let user: User | null = null;
        if (sent.from) {
            user = await this.userRepository.upsert({
                tgId: sent.from.id,
                isBot: sent.from.is_bot,
                firstName: sent.from.first_name,
                lastName: sent.from.last_name,
                username: sent.from.username,
                languageCode: sent.from.language_code,
            });
        }

        const chat = await this.chatRepository.upsert({
            tgId: sent.chat.id,
            type: sent.chat.type,
            title: sent.chat.title,
            firstName: sent.chat.first_name,
            lastName: sent.chat.last_name,
            username: sent.chat.username,
            isForum: Boolean(sent.chat.is_forum),
            isDirectMessages: Boolean(sent.chat.is_direct_messages),
        });

        let replyToId: number | undefined;
        if (options.replyToMessageId) {
            replyToId = await this.messageRepository.getIdByTelegramId(chatId, options.replyToMessageId);
        }

        if (user) {
            await this.messageRepository.upsert({
                chatId: chat.id,
                userId: user.id,
                messageTgId: sent.message_id,
                threadTgId: sent.message_thread_id,
                replyToId,
                sentAt: sent.date,
                text: sent.text || sent.caption,
            });
        }

        return sent;
    }

    async editMessage(text: string, chatId: number, messageId: number, options: SendOptions = {}) {
        const edited = await this.tg.editMessage(text, chatId, messageId, options);
        await this.messageRepository.updateByTelegramId(chatId, messageId, text);
        return edited;
    }

    async deleteMessage(chatId: number, messageId: number) {
        const [deleted] = await Promise.all([
            this.tg.deleteMessage(chatId, messageId),
            this.messageRepository.deleteByTelegramId(chatId, messageId),
        ]);
        return deleted;
    }
}
